package com.blog.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public class BlogRepository {

    private static final Logger logger = LoggerFactory.getLogger(BlogRepository.class);
    private final DynamoDbClient dynamoDbClient;
    private final S3Service s3Service;
    private final String tableName = System.getenv().getOrDefault("BLOG_TABLE_NAME", "BlogTable");

    public BlogRepository(DynamoDbClient dynamoDbClient, S3Service s3Service) {
        this.dynamoDbClient = dynamoDbClient;
        this.s3Service = s3Service;
    }

    public void saveBlog(Blog blog) {
        logger.info("Saving/Updating blog: {}", blog.getId());
        
        // Normalize categories: Trim, Uppercase, and Remove Duplicates
        List<String> normalizedCategories = new ArrayList<>();
        if (blog.getCategories() != null) {
            normalizedCategories = blog.getCategories().stream()
                .filter(c -> c != null && !c.trim().isEmpty())
                .map(c -> c.trim().toUpperCase())
                .distinct()
                .toList();
            blog.setCategories(normalizedCategories);
        }

        // 0. Normalize categories
        List<String> categories = blog.getCategories() != null ? blog.getCategories().stream()
                .filter(java.util.Objects::nonNull)
                .map(String::trim)
                .filter(c -> !c.isEmpty())
                .map(String::toUpperCase)
                .distinct()
                .toList() : new ArrayList<>();
        blog.setCategories(categories);

        // 1. Prepare Metadata Item
        Map<String, AttributeValue> metadata = new HashMap<>();
        metadata.put("PK", AttributeValue.builder().s("BLOG#" + blog.getId()).build());
        metadata.put("SK", AttributeValue.builder().s("METADATA").build());
        metadata.put("id", AttributeValue.builder().s(blog.getId()).build());
        metadata.put("title", AttributeValue.builder().s(blog.getTitle()).build());
        metadata.put("content", AttributeValue.builder().s(blog.getContent()).build());
        metadata.put("authorId", AttributeValue.builder().s(blog.getAuthorId()).build());
        metadata.put("status", AttributeValue.builder().s(blog.getStatus() != null ? blog.getStatus() : "PUBLISHED").build());
        metadata.put("createdAt", AttributeValue.builder().s(blog.getCreatedAt()).build());
        
        if (blog.getAuthorName() != null) metadata.put("authorName", AttributeValue.builder().s(blog.getAuthorName()).build());
        if (blog.getImageUrl() != null) metadata.put("imageUrl", AttributeValue.builder().s(blog.getImageUrl()).build());
        if (blog.getSummary_ai() != null) metadata.put("summary_ai", AttributeValue.builder().s(blog.getSummary_ai()).build());
        if (blog.getUpdatedAt() != null) metadata.put("updatedAt", AttributeValue.builder().s(blog.getUpdatedAt()).build());
        
        if (!categories.isEmpty()) {
            metadata.put("categories", AttributeValue.builder().l(
                categories.stream().map(c -> AttributeValue.builder().s(c).build()).toList()
            ).build());
        }

        // 2. Prepare Batch Write Requests
        List<WriteRequest> writeRequests = new ArrayList<>();
        writeRequests.add(WriteRequest.builder().putRequest(PutRequest.builder().item(metadata).build()).build());

        if (!categories.isEmpty() && "PUBLISHED".equals(blog.getStatus())) {
            for (String category : categories) {
                Map<String, AttributeValue> mapping = new HashMap<>();
                mapping.put("PK", AttributeValue.builder().s("CATEGORY#" + category).build());
                mapping.put("SK", AttributeValue.builder().s(blog.getCreatedAt() + "#BLOG#" + blog.getId()).build());
                
                mapping.put("id", AttributeValue.builder().s(blog.getId()).build());
                mapping.put("title", AttributeValue.builder().s(blog.getTitle()).build());
                mapping.put("authorId", AttributeValue.builder().s(blog.getAuthorId()).build());
                mapping.put("content", AttributeValue.builder().s(blog.getContent()).build());
                mapping.put("authorName", AttributeValue.builder().s(blog.getAuthorName() != null ? blog.getAuthorName() : "Unknown").build());
                mapping.put("createdAt", AttributeValue.builder().s(blog.getCreatedAt()).build());
                
                if (blog.getImageUrl() != null) mapping.put("imageUrl", AttributeValue.builder().s(blog.getImageUrl()).build());
                if (blog.getSummary_ai() != null) mapping.put("summary_ai", AttributeValue.builder().s(blog.getSummary_ai()).build());
                
                mapping.put("categories", AttributeValue.builder().l(
                    categories.stream().map(c -> AttributeValue.builder().s(c).build()).toList()
                ).build());
                
                writeRequests.add(WriteRequest.builder().putRequest(PutRequest.builder().item(mapping).build()).build());
            }
        }

        BatchWriteItemRequest batchRequest = BatchWriteItemRequest.builder()
                .requestItems(Map.of(tableName, writeRequests))
                .build();
        
        dynamoDbClient.batchWriteItem(batchRequest);
    }

    public void deleteBlog(String id) {
        logger.info("Deleting blog: {}", id);
        Blog blog = getBlog(id);
        if (blog == null) return;

        if (blog.getImageUrl() != null) {
            s3Service.deleteFileFromUrl(blog.getImageUrl());
        }

        List<WriteRequest> deleteRequests = new ArrayList<>();
        deleteRequests.add(WriteRequest.builder().deleteRequest(DeleteRequest.builder()
                .key(Map.of(
                    "PK", AttributeValue.builder().s("BLOG#" + id).build(),
                    "SK", AttributeValue.builder().s("METADATA").build()
                )).build()).build());

        if (blog.getCategories() != null) {
            for (String category : blog.getCategories()) {
                deleteRequests.add(WriteRequest.builder().deleteRequest(DeleteRequest.builder()
                        .key(Map.of(
                            "PK", AttributeValue.builder().s("CATEGORY#" + category.toUpperCase()).build(),
                            "SK", AttributeValue.builder().s(blog.getCreatedAt() + "#BLOG#" + blog.getId()).build()
                        )).build()).build());
            }
        }

        BatchWriteItemRequest batchRequest = BatchWriteItemRequest.builder()
                .requestItems(Map.of(tableName, deleteRequests))
                .build();
        
        dynamoDbClient.batchWriteItem(batchRequest);
    }

    public List<Blog> listBlogsByCategory(String category) {
        Map<String, AttributeValue> exprValues = new HashMap<>();
        exprValues.put(":pk", AttributeValue.builder().s("CATEGORY#" + category.toUpperCase()).build());

        QueryRequest request = QueryRequest.builder()
                .tableName(tableName)
                .keyConditionExpression("PK = :pk")
                .expressionAttributeValues(exprValues)
                .scanIndexForward(false)
                .build();

        QueryResponse response = dynamoDbClient.query(request);
        return response.items().stream().map(this::mapToBlog).toList();
    }

    public PaginatedResult listBlogs(Integer limit, String nextToken) {
        Map<String, String> attrNames = Map.of("#s", "status");
        Map<String, AttributeValue> attrValues = Map.of(":status", AttributeValue.builder().s("PUBLISHED").build());

        QueryRequest.Builder builder = QueryRequest.builder()
                .tableName(tableName)
                .indexName("StatusIndex")
                .keyConditionExpression("#s = :status")
                .expressionAttributeNames(attrNames)
                .expressionAttributeValues(attrValues)
                .scanIndexForward(false);

        if (limit != null) builder.limit(limit);
        if (nextToken != null && !nextToken.isEmpty()) {
            builder.exclusiveStartKey(TokenSerializer.deserialize(nextToken));
        }

        QueryResponse response = dynamoDbClient.query(builder.build());
        List<Blog> blogs = response.items().stream().map(this::mapToBlog).toList();
        String next = response.hasLastEvaluatedKey() ? TokenSerializer.serialize(response.lastEvaluatedKey()) : null;
        
        return new PaginatedResult(blogs, next);
    }

    public Blog getBlog(String id) {
        Map<String, AttributeValue> key = Map.of(
            "PK", AttributeValue.builder().s("BLOG#" + id).build(),
            "SK", AttributeValue.builder().s("METADATA").build()
        );

        GetItemResponse response = dynamoDbClient.getItem(GetItemRequest.builder().tableName(tableName).key(key).build());
        return (response.hasItem() && !response.item().isEmpty()) ? mapToBlog(response.item()) : null;
    }

    public void updateBlog(Blog blog) {
        logger.info("Updating blog: {}", blog.getId());
        Blog existingBlog = getBlog(blog.getId());
        
        if (existingBlog != null && existingBlog.getCategories() != null) {
            // Find categories that are in existing but NOT in new blog
            List<String> removedCategories = existingBlog.getCategories().stream()
                    .filter(c -> blog.getCategories() == null || !blog.getCategories().contains(c))
                    .toList();
            
            if (!removedCategories.isEmpty()) {
                logger.info("Removing old category mappings: {}", removedCategories);
                List<WriteRequest> deleteRequests = removedCategories.stream()
                        .map(category -> WriteRequest.builder().deleteRequest(DeleteRequest.builder()
                                .key(Map.of(
                                    "PK", AttributeValue.builder().s("CATEGORY#" + category.toUpperCase()).build(),
                                    "SK", AttributeValue.builder().s(existingBlog.getCreatedAt() + "#BLOG#" + blog.getId()).build()
                                )).build()).build())
                        .toList();
                
                dynamoDbClient.batchWriteItem(BatchWriteItemRequest.builder()
                        .requestItems(Map.of(tableName, deleteRequests))
                        .build());
            }
        }
        
        saveBlog(blog);
    }

    private Blog mapToBlog(Map<String, AttributeValue> item) {
        Blog blog = new Blog();
        if (item.containsKey("id")) blog.setId(item.get("id").s());
        if (item.containsKey("title")) blog.setTitle(item.get("title").s());
        if (item.containsKey("content")) blog.setContent(item.get("content").s());
        if (item.containsKey("authorId")) blog.setAuthorId(item.get("authorId").s());
        if (item.containsKey("authorName")) blog.setAuthorName(item.get("authorName").s());
        if (item.containsKey("status")) blog.setStatus(item.get("status").s());
        if (item.containsKey("createdAt")) blog.setCreatedAt(item.get("createdAt").s());
        if (item.containsKey("imageUrl")) blog.setImageUrl(item.get("imageUrl").s());
        if (item.containsKey("summary_ai")) blog.setSummary_ai(item.get("summary_ai").s());
        if (item.containsKey("updatedAt")) blog.setUpdatedAt(item.get("updatedAt").s());
        
        blog.setCategories(new ArrayList<>());
        if (item.containsKey("categories") && item.get("categories").hasL()) {
            blog.setCategories(new java.util.ArrayList<>(item.get("categories").l().stream().map(AttributeValue::s).toList()));
        }
        return blog;
    }

    public static class PaginatedResult {
        private final List<Blog> items;
        private final String nextToken;

        public PaginatedResult(List<Blog> items, String nextToken) {
            this.items = items;
            this.nextToken = nextToken;
        }

        public List<Blog> getItems() { return items; }
        public String getNextToken() { return nextToken; }
    }
}
