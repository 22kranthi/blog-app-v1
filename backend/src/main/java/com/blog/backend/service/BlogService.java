package com.blog.backend.service;

import com.blog.backend.model.AppSyncEvent;
import com.blog.backend.model.Blog;
import com.blog.backend.model.PaginatedResult;
import com.blog.backend.repository.BlogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class BlogService {

    private static final Logger logger = LoggerFactory.getLogger(BlogService.class);
    private final BlogRepository blogRepository;
    private final BedrockService bedrockService;
    private final S3Service s3Service;

    public BlogService(BlogRepository blogRepository, BedrockService bedrockService, S3Service s3Service) {
        this.blogRepository = blogRepository;
        this.bedrockService = bedrockService;
        this.s3Service = s3Service;
    }

    public boolean isAdminIdentity(AppSyncEvent.Identity identity) {
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

    public Boolean deleteBlog(Map<String, Object> args, AppSyncEvent.Identity identity) {
        String id = (String) args.get("id");
        Blog existing = blogRepository.getBlog(id);
        if (existing == null) {
            throw new RuntimeException("Blog not found");
        }

        String username = identity != null && identity.getUsername() != null ? identity.getUsername() : "";
        if (!isAdminIdentity(identity) && !username.equals(existing.getAuthorId())) {
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

    private void validateBlogInput(String title, String content, java.util.List<String> categories) {
        if (title != null) {
            if (title.trim().isEmpty()) throw new IllegalArgumentException("Title cannot be blank");
            if (title.length() > 200) throw new IllegalArgumentException("Title must be less than 200 characters");
        }
        if (content != null) {
            if (content.trim().isEmpty()) throw new IllegalArgumentException("Content cannot be blank");
            if (content.length() > 50000) throw new IllegalArgumentException("Content must be less than 50000 characters");
        }
        if (categories != null && categories.size() > 5) {
            throw new IllegalArgumentException("A maximum of 5 categories are allowed");
        }
    }

    public Blog updateBlog(Map<String, Object> args, AppSyncEvent.Identity identity) {
        String id = (String) args.get("id");
        String username = identity != null && identity.getUsername() != null ? identity.getUsername() : "unknown";
        logger.info("Updating blog ID: {} for user: {}", id, username);

        Blog existing = blogRepository.getBlog(id);
        if (existing == null) {
            logger.error("Update failed: Blog not found with ID {}", id);
            throw new RuntimeException("Blog not found");
        }

        if (!isAdminIdentity(identity) && !username.equals(existing.getAuthorId())) {
            logger.warn("Update unauthorized for user: {}", username);
            throw new RuntimeException("Unauthorized: You do not have permission to edit this blog");
        }

        String title = (String) args.get("title");
        String content = (String) args.get("content");
        java.util.List<String> categories = asStringList(args.get("categories"));
        String status = (String) args.get("status");
        String imageUrl = (String) args.get("imageUrl");
        String authorName = (String) args.get("authorName");

        validateBlogInput(title, content, categories);

        if (title != null) existing.setTitle(title);
        if (content != null) {
            existing.setContent(content);
            logger.info("Regenerating AI summary for updated content...");
            String newSummary = bedrockService.generateSummary(content);
            existing.setSummary_ai(newSummary);
        }
        if (categories != null) existing.setCategories(categories);
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

    public Blog createBlog(Map<String, Object> args, AppSyncEvent.Identity identity) {
        String title = (String) args.get("title");
        String content = (String) args.get("content");
        java.util.List<String> categories = asStringList(args.get("categories"));
        
        if (title == null || content == null) {
            throw new IllegalArgumentException("Title and content are required to create a blog");
        }
        validateBlogInput(title, content, categories);

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
        blog.setCategories(categories);
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

    public String getUploadUrl(Map<String, Object> args, AppSyncEvent.Identity identity) {
        if (identity == null || identity.getUsername() == null || identity.getUsername().isBlank()) {
            throw new RuntimeException("Unauthorized: authentication required to upload");
        }
        String filename = (String) args.get("filename");
        String contentType = (String) args.get("contentType");
        return s3Service.generatePresignedUrl(filename, contentType, identity.getUsername());
    }

    public PaginatedResult listBlogs(Map<String, Object> args) {
        Integer limit = (Integer) args.get("limit");
        String nextToken = (String) args.get("nextToken");
        return blogRepository.listBlogs(limit, nextToken);
    }

    public Blog getBlogQuery(Map<String, Object> args) {
        String id = (String) args.get("id");
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("id is required");
        }
        return blogRepository.getBlog(id);
    }

    public PaginatedResult listBlogsByCategory(Map<String, Object> args) {
        String category = (String) args.get("category");
        if (category == null || category.isBlank()) {
            throw new IllegalArgumentException("category is required");
        }
        Integer limit = (Integer) args.get("limit");
        String nextToken = (String) args.get("nextToken");
        return blogRepository.listBlogsByCategory(category, limit, nextToken);
    }

    public PaginatedResult listBlogsByAuthor(Map<String, Object> args) {
        String authorId = (String) args.get("authorId");
        Integer limit = (Integer) args.get("limit");
        String nextToken = (String) args.get("nextToken");
        return blogRepository.listBlogsByAuthor(authorId, limit, nextToken);
    }

    private java.util.List<String> asStringList(Object obj) {
        if (!(obj instanceof java.util.List)) {
            return java.util.Collections.emptyList();
        }
        java.util.List<?> list = (java.util.List<?>) obj;
        return list.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .toList();
    }
}
