package com.blog.backend;

import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public class BlogRepository {

    private final DynamoDbClient dynamoDbClient;
    private final String tableName = System.getenv().getOrDefault("BLOG_TABLE_NAME", "BlogTable");

    public BlogRepository(DynamoDbClient dynamoDbClient) {
        this.dynamoDbClient = dynamoDbClient;
    }

    public void saveBlog(Blog blog) {
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("PK", AttributeValue.builder().s("BLOG#" + blog.getId()).build());
        item.put("SK", AttributeValue.builder().s("METADATA").build());
        item.put("id", AttributeValue.builder().s(blog.getId()).build());
        item.put("title", AttributeValue.builder().s(blog.getTitle()).build());
        item.put("content", AttributeValue.builder().s(blog.getContent()).build());
        item.put("authorId", AttributeValue.builder().s(blog.getAuthorId()).build());
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

    public List<Blog> listBlogs() {
        ScanRequest scanRequest = ScanRequest.builder()
                .tableName(tableName)
                .build();

        ScanResponse response = dynamoDbClient.scan(scanRequest);
        List<Blog> blogs = new ArrayList<>();
        for (Map<String, AttributeValue> item : response.items()) {
            blogs.add(mapToBlog(item));
        }
        return blogs;
    }

    public List<Blog> listBlogsByCategory(String category) {
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
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("PK", AttributeValue.builder().s("BLOG#" + id).build());
        key.put("SK", AttributeValue.builder().s("METADATA").build());

        GetItemRequest request = GetItemRequest.builder()
                .tableName(tableName)
                .key(key)
                .build();

        GetItemResponse response = dynamoDbClient.getItem(request);
        if (!response.hasItem() || response.item().isEmpty()) {
            return null;
        }
        return mapToBlog(response.item());
    }

    public void updateBlog(Blog blog) {
        // In DynamoDB, overwriting with PutItem is often sufficient and easier for complete objects
        saveBlog(blog);
    }

    public void deleteBlog(String id) {
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
        if (item.containsKey("category")) blog.setCategory(item.get("category").s());
        if (item.containsKey("status")) blog.setStatus(item.get("status").s());
        if (item.containsKey("createdAt")) blog.setCreatedAt(item.get("createdAt").s());
        if (item.containsKey("imageUrl")) blog.setImageUrl(item.get("imageUrl").s());
        if (item.containsKey("summary_ai")) blog.setSummary_ai(item.get("summary_ai").s());
        return blog;
    }
}
