package com.blog.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

@Configuration
public class BlogFunctionConfig {

    private static final Logger logger = LoggerFactory.getLogger(BlogFunctionConfig.class);
    private final BlogRepository blogRepository;
    private final BedrockService bedrockService;
    private final S3Service s3Service;

    public BlogFunctionConfig(BlogRepository blogRepository, BedrockService bedrockService, S3Service s3Service) {
        this.blogRepository = blogRepository;
        this.bedrockService = bedrockService;
        this.s3Service = s3Service;
    }

    @Bean
    public Function<AppSyncEvent, Object> handleRequest() {
        return event -> {
            String fieldName = event.getInfo().getFieldName();
            String parentTypeName = event.getInfo().getParentTypeName();
            Map<String, Object> arguments = event.getArguments();

            logger.info("Processing GraphQL Request: {}.{}", parentTypeName, fieldName);

            if ("Mutation".equals(parentTypeName)) {
                switch (fieldName) {
                    case "createBlog":
                        return createBlog(arguments, event.getIdentity());
                    case "getUploadUrl":
                        return getUploadUrl(arguments, event.getIdentity());
                    case "deleteBlog":
                        return deleteBlog(arguments, event.getIdentity());
                    case "updateBlog":
                        return updateBlog(arguments, event.getIdentity());
                    default:
                        throw new IllegalArgumentException("Unknown mutation: " + fieldName);
                }
            } else if ("Query".equals(parentTypeName)) {
                switch (fieldName) {
                    case "listBlogs":
                        return listBlogs(arguments);
                    case "getBlog":
                        return getBlogQuery(arguments);
                    case "listBlogsByCategory":
                        return listBlogsByCategory(arguments);
                    default:
                        throw new IllegalArgumentException("Unknown query: " + fieldName);
                }
            }
            throw new IllegalArgumentException("Unknown type: " + parentTypeName);
        };
    }

    private boolean isAdmin(AppSyncEvent.Identity identity) {
        if (identity == null || identity.getClaims() == null) return false;
        Object groups = identity.getClaims().get("cognito:groups");
        if (groups instanceof java.util.List) {
            return ((java.util.List<?>) groups).contains("ADMIN");
        }
        if (groups instanceof String) {
            String s = ((String) groups).trim();
            if (s.startsWith("[")) {
                return s.contains("\"ADMIN\"");
            }
            for (String g : s.split(",")) {
                if ("ADMIN".equals(g.trim())) return true;
            }
        }
        return false;
    }

    private Boolean deleteBlog(Map<String, Object> args, AppSyncEvent.Identity identity) {
        String id = (String) args.get("id");
        Blog existing = blogRepository.getBlog(id);
        if (existing == null) {
            throw new RuntimeException("Blog not found");
        }
        
        String username = identity != null && identity.getUsername() != null ? identity.getUsername() : "";
        if (!isAdmin(identity) && !username.equals(existing.getAuthorId())) {
            logger.warn("Delete unauthorized for user: {}", username);
            throw new RuntimeException("Unauthorized: You do not have permission to delete this blog");
        }
        
        // Clean up S3 image if it exists
        if (existing.getImageUrl() != null) {
            logger.info("Cleaning up S3 image for deleted blog: {}", existing.getImageUrl());
            s3Service.deleteFileFromUrl(existing.getImageUrl());
        }
        
        blogRepository.deleteBlog(id);
        logger.info("Deleted blog with ID: {}", id);
        return true;
    }

    private Blog updateBlog(Map<String, Object> args, AppSyncEvent.Identity identity) {
        String id = (String) args.get("id");
        String username = identity != null && identity.getUsername() != null ? identity.getUsername() : "unknown";
        logger.info("Updating blog ID: {} for user: {}", id, username);
        
        Blog existing = blogRepository.getBlog(id);
        if (existing == null) {
            logger.error("Update failed: Blog not found with ID {}", id);
            throw new RuntimeException("Blog not found");
        }
        
        if (!isAdmin(identity) && !username.equals(existing.getAuthorId())) {
            logger.warn("Update unauthorized for user: {}", username);
            throw new RuntimeException("Unauthorized: You do not have permission to edit this blog");
        }

        String title = (String) args.get("title");
        String content = (String) args.get("content");
        String category = (String) args.get("category");
        String status = (String) args.get("status");
        String imageUrl = (String) args.get("imageUrl");
        String authorName = (String) args.get("authorName");

        if (title != null) existing.setTitle(title);
        if (content != null) {
            existing.setContent(content);
            logger.info("Regenerating AI summary for updated content...");
            String newSummary = bedrockService.generateSummary(content);
            existing.setSummary_ai(newSummary);
        }
        if (category != null) existing.setCategory(category);
        if (status != null) existing.setStatus(status);
        
        if (imageUrl != null) {
            // If the image is being changed, delete the old one from S3
            if (existing.getImageUrl() != null && !existing.getImageUrl().equals(imageUrl)) {
                logger.info("Deleting old S3 image: {}", existing.getImageUrl());
                s3Service.deleteFileFromUrl(existing.getImageUrl());
            }
            existing.setImageUrl(imageUrl);
        }
        
        if (authorName != null) existing.setAuthorName(authorName);
        existing.setUpdatedAt(java.time.OffsetDateTime.now().toString());

        blogRepository.updateBlog(existing);
        logger.info("Successfully updated blog ID: {}", id);
        return existing;
    }

    private Blog createBlog(Map<String, Object> args, AppSyncEvent.Identity identity) {
        String title = (String) args.get("title");
        String content = (String) args.get("content");
        String category = (String) args.get("category");
        String imageUrl = (String) args.get("imageUrl");
        String authorNameArg = (String) args.get("authorName");
        String authorId = identity != null && identity.getUsername() != null ? identity.getUsername() : "anonymous";
        String authorName = (authorNameArg != null) ? authorNameArg : authorId;

        logger.info("Creating new blog. Title: {}, Author: {}", title, authorId);

        // Call Bedrock for AI Summary
        logger.info("Requesting AI summary from Bedrock...");
        String aiSummary = bedrockService.generateSummary(content);

        Blog blog = new Blog();
        blog.setId(UUID.randomUUID().toString());
        blog.setTitle(title);
        blog.setContent(content);
        blog.setCategory(category);
        blog.setAuthorId(authorId);
        blog.setAuthorName(authorName);
        blog.setStatus("PUBLISHED");
        blog.setImageUrl(imageUrl);
        blog.setSummary_ai(aiSummary);
        String now = java.time.OffsetDateTime.now().toString();
        blog.setCreatedAt(now);
        blog.setUpdatedAt(now);

        logger.info("Saving new blog to DynamoDB...");
        // Persist to DynamoDB
        blogRepository.saveBlog(blog);

        logger.info("Successfully created blog with ID: {}", blog.getId());
        return blog;
    }

    private String getUploadUrl(Map<String, Object> args, AppSyncEvent.Identity identity) {
        if (identity == null || identity.getUsername() == null || identity.getUsername().isBlank()) {
            throw new RuntimeException("Unauthorized: authentication required to upload");
        }
        String filename = (String) args.get("filename");
        String contentType = (String) args.get("contentType");
        return s3Service.generatePresignedUrl(filename, contentType, identity.getUsername());
    }

    private BlogRepository.PaginatedResult listBlogs(Map<String, Object> args) {
        Integer limit = (Integer) args.get("limit");
        String nextToken = (String) args.get("nextToken");
        return blogRepository.listBlogs(limit, nextToken);
    }

    private Blog getBlogQuery(Map<String, Object> args) {
        String id = (String) args.get("id");
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("id is required");
        }
        return blogRepository.getBlog(id);
    }

    private java.util.List<Blog> listBlogsByCategory(Map<String, Object> args) {
        String category = (String) args.get("category");
        if (category == null || category.isBlank()) {
            throw new IllegalArgumentException("category is required");
        }
        return blogRepository.listBlogsByCategory(category);
    }
}
