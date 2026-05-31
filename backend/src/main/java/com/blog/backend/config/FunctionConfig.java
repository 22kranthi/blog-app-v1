package com.blog.backend.config;

import com.blog.backend.model.AppSyncEvent;
import com.blog.backend.service.BlogService;
import com.blog.backend.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;
import java.util.function.Function;

@Configuration
public class FunctionConfig {

    private static final Logger logger = LoggerFactory.getLogger(FunctionConfig.class);
    private final BlogService blogService;
    private final UserService userService;

    public FunctionConfig(BlogService blogService, UserService userService) {
        this.blogService = blogService;
        this.userService = userService;
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
                        return blogService.createBlog(arguments, event.getIdentity());
                    case "getUploadUrl":
                        return blogService.getUploadUrl(arguments, event.getIdentity());
                    case "deleteBlog":
                        return blogService.deleteBlog(arguments, event.getIdentity());
                    case "updateBlog":
                        return blogService.updateBlog(arguments, event.getIdentity());
                    case "setAdminRole":
                        boolean callerIsAdmin = blogService.isAdminIdentity(event.getIdentity());
                        return userService.setAdminRole(arguments, callerIsAdmin);
                    default:
                        throw new IllegalArgumentException("Unknown mutation: " + fieldName);
                }
            } else if ("Query".equals(parentTypeName)) {
                switch (fieldName) {
                    case "listBlogs":
                        return blogService.listBlogs(arguments);
                    case "getBlog":
                        return blogService.getBlogQuery(arguments);
                    case "listBlogsByCategory":
                        return blogService.listBlogsByCategory(arguments);
                    case "listBlogsByAuthor":
                        return blogService.listBlogsByAuthor(arguments);
                    case "listUsers":
                        return userService.listUsers(arguments);
                    default:
                        throw new IllegalArgumentException("Unknown query: " + fieldName);
                }
            }
            throw new IllegalArgumentException("Unknown type: " + parentTypeName);
        };
    }


}
