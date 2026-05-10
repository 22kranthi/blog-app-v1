package com.blog.backend.model;

import java.util.List;

public class PaginatedResult {
    private final List<Blog> items;
    private final String nextToken;

    public PaginatedResult(List<Blog> items, String nextToken) {
        this.items = items;
        this.nextToken = nextToken;
    }

    public List<Blog> getItems() { return items; }
    public String getNextToken() { return nextToken; }
}
