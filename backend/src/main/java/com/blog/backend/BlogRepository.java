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
    private final String tableName = System.getenv().getOrDefault("BLOG_TABLE_NAME", "BlogTable");

    public BlogRepository(DynamoDbClient dynamoDbClient) {
        this.dynamoDbClient = dynamoDbClient;
    }

    public void saveBlog(Blog blog) {
        logger.info("Saving new blog: {}", blog.getId());
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("PK", AttributeValue.builder().s("BLOG#" + blog.getId()).build());
        item.put("SK", AttributeValue.builder().s("METADATA").build());
        item.put("id", AttributeValue.builder().s(blog.getId()).build());
        item.put("title", AttributeValue.builder().s(blog.getTitle()).build());
        item.put("content", AttributeValue.builder().s(blog.getContent()).build());
        item.put("authorId", AttributeValue.builder().s(blog.getAuthorId()).build());
        if (blog.getAuthorName() != null) {
            item.put("authorName", AttributeValue.builder().s(blog.getAuthorName()).build());
        }
        item.put("category", AttributeValue.builder().s(blog.getCategory()).build());
        item.put("status", AttributeValue.builder().s(blog.getStatus()).build());
        item.put("createdAt", AttributeValue.builder().s(blog.getCreatedAt()).build());
        
        if (blog.getImageUrl() != null) {
            item.put("imageUrl", AttributeValue.builder().s(blog.getImageUrl()).build());
        }
        if (blog.getSummary_ai() != null) {
            item.put("summary_ai", AttributeValue.builder().s(blog.getSummary_ai()).build());
        }

        PutItemRequest request = PutItemRequest.builder()
                .tableName(tableName)
                .item(item)
                .build();

        dynamoDbClient.putItem(request);
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

    public PaginatedResult listBlogs(Integer limit, String nextToken) {
        logger.info("Querying blogs from StatusIndex with limit: {} and nextToken: {}", limit, nextToken);
        
        Map<String, String> expressionAttributeNames = new HashMap<>();
        expressionAttributeNames.put("#s", "status");

        Map<String, AttributeValue> expressionAttributeValues = new HashMap<>();
        expressionAttributeValues.put(":status", AttributeValue.builder().s("PUBLISHED").build());

        QueryRequest.Builder builder = QueryRequest.builder()
                .tableName(tableName)
                .indexName("StatusIndex")
                .keyConditionExpression("#s = :status")
                .expressionAttributeNames(expressionAttributeNames)
                .expressionAttributeValues(expressionAttributeValues)
                .scanIndexForward(false); // Newest first

        if (limit != null && limit > 0) {
            builder.limit(limit);
        }

        if (nextToken != null && !nextToken.isEmpty()) {
            // In a GSI query, the ExclusiveStartKey must contain the Index keys + the Table keys
            // Format: "status|createdAt|id" (simplified for this example)
            try {
                String[] parts = nextToken.split("\\|");
                if (parts.length >= 3) {
                    Map<String, AttributeValue> startKey = new HashMap<>();
                    startKey.put("status", AttributeValue.builder().s("PUBLISHED").build());
                    startKey.put("createdAt", AttributeValue.builder().s(parts[1]).build());
                    startKey.put("PK", AttributeValue.builder().s("BLOG#" + parts[2]).build());
                    startKey.put("SK", AttributeValue.builder().s("METADATA").build());
                    builder.exclusiveStartKey(startKey);
                }
            } catch (Exception e) {
                logger.error("Error parsing nextToken: {}", nextToken);
            }
        }

        QueryResponse response = dynamoDbClient.query(builder.build());
        List<Blog> blogs = new ArrayList<>();
        for (Map<String, AttributeValue> item : response.items()) {
            blogs.add(mapToBlog(item));
        }

        String newNextToken = null;
        if (response.hasLastEvaluatedKey()) {
            Map<String, AttributeValue> lek = response.lastEvaluatedKey();
            // Create a compound token for the next page
            String createdAt = lek.get("createdAt").s();
            String id = lek.get("PK").s().replace("BLOG#", "");
            newNextToken = "PUBLISHED|" + createdAt + "|" + id;
        }

        return new PaginatedResult(blogs, newNextToken);
    }

    public List<Blog> listBlogsByCategory(String category) {
        logger.info("Querying blogs by category: {}", category);
        Map<String, AttributeValue> exprValues = new HashMap<>();
        exprValues.put(":cat", AttributeValue.builder().s(category).build());

        QueryRequest request = QueryRequest.builder()
                .tableName(tableName)
                .indexName("CategoryIndex")
                .keyConditionExpression("category = :cat")
                .expressionAttributeValues(exprValues)
                .scanIndexForward(false)
                .build();

        QueryResponse response = dynamoDbClient.query(request);
        List<Blog> blogs = new ArrayList<>();
        for (Map<String, AttributeValue> item : response.items()) {
            blogs.add(mapToBlog(item));
        }
        return blogs;
    }

    public Blog getBlog(String id) {
        logger.info("Fetching blog by ID: {}", id);
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("PK", AttributeValue.builder().s("BLOG#" + id).build());
        key.put("SK", AttributeValue.builder().s("METADATA").build());

        GetItemRequest request = GetItemRequest.builder()
                .tableName(tableName)
                .key(key)
                .build();

        GetItemResponse response = dynamoDbClient.getItem(request);
        if (!response.hasItem() || response.item().isEmpty()) {
            logger.warn("Blog not found: {}", id);
            return null;
        }
        return mapToBlog(response.item());
    }

    public void updateBlog(Blog blog) {
        logger.info("Performing partial update for blog: {}", blog.getId());
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("PK", AttributeValue.builder().s("BLOG#" + blog.getId()).build());
        key.put("SK", AttributeValue.builder().s("METADATA").build());

        Map<String, AttributeValueUpdate> updates = new HashMap<>();
        updates.put("title", AttributeValueUpdate.builder()
                .value(AttributeValue.builder().s(blog.getTitle()).build())
                .action(AttributeAction.PUT).build());
        updates.put("content", AttributeValueUpdate.builder()
                .value(AttributeValue.builder().s(blog.getContent()).build())
                .action(AttributeAction.PUT).build());
        updates.put("category", AttributeValueUpdate.builder()
                .value(AttributeValue.builder().s(blog.getCategory()).build())
                .action(AttributeAction.PUT).build());
        updates.put("status", AttributeValueUpdate.builder()
                .value(AttributeValue.builder().s(blog.getStatus()).build())
                .action(AttributeAction.PUT).build());
        
        if (blog.getAuthorName() != null) {
            updates.put("authorName", AttributeValueUpdate.builder()
                    .value(AttributeValue.builder().s(blog.getAuthorName()).build())
                    .action(AttributeAction.PUT).build());
        }
        if (blog.getImageUrl() != null) {
            updates.put("imageUrl", AttributeValueUpdate.builder()
                    .value(AttributeValue.builder().s(blog.getImageUrl()).build())
                    .action(AttributeAction.PUT).build());
        }
        if (blog.getSummary_ai() != null) {
            updates.put("summary_ai", AttributeValueUpdate.builder()
                    .value(AttributeValue.builder().s(blog.getSummary_ai()).build())
                    .action(AttributeAction.PUT).build());
        }

        UpdateItemRequest request = UpdateItemRequest.builder()
                .tableName(tableName)
                .key(key)
                .attributeUpdates(updates)
                .build();

        dynamoDbClient.updateItem(request);
    }

    public void deleteBlog(String id) {
        logger.info("Deleting blog: {}", id);
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("PK", AttributeValue.builder().s("BLOG#" + id).build());
        key.put("SK", AttributeValue.builder().s("METADATA").build());

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(tableName)
                .key(key)
                .build();

        dynamoDbClient.deleteItem(request);
    }

    private Blog mapToBlog(Map<String, AttributeValue> item) {
        Blog blog = new Blog();
        if (item.containsKey("id")) blog.setId(item.get("id").s());
        if (item.containsKey("title")) blog.setTitle(item.get("title").s());
        if (item.containsKey("content")) blog.setContent(item.get("content").s());
        if (item.containsKey("authorId")) blog.setAuthorId(item.get("authorId").s());
        if (item.containsKey("authorName")) blog.setAuthorName(item.get("authorName").s());
        if (item.containsKey("category")) blog.setCategory(item.get("category").s());
        if (item.containsKey("status")) blog.setStatus(item.get("status").s());
        if (item.containsKey("createdAt")) blog.setCreatedAt(item.get("createdAt").s());
        if (item.containsKey("imageUrl")) blog.setImageUrl(item.get("imageUrl").s());
        if (item.containsKey("summary_ai")) blog.setSummary_ai(item.get("summary_ai").s());
        return blog;
    }
}
