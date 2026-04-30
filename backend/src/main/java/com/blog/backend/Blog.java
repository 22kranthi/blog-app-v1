package com.blog.backend;

public class Blog {
    private String id;
    private String title;
    private String content;
    private String authorId;
    private String category;
    private String status;
    private String imageUrl;
    private String summary_ai;
    private String authorName;
    private String createdAt;
    private String updatedAt;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getAuthorId() { return authorId; }
    public void setAuthorId(String authorId) { this.authorId = authorId; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { 
        if (category != null && !category.trim().isEmpty()) {
            String trimmed = category.trim();
            if (trimmed.length() > 1) {
                this.category = trimmed.substring(0, 1).toUpperCase() + trimmed.substring(1).toLowerCase();
            } else {
                this.category = trimmed.toUpperCase();
            }
        } else {
            this.category = category;
        }
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getSummary_ai() { return summary_ai; }
    public void setSummary_ai(String summary_ai) { this.summary_ai = summary_ai; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
