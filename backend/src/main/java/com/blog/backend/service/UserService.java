package com.blog.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;

import java.util.*;

@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    private final CognitoIdentityProviderClient cognitoClient;
    private final String userPoolId;

    public UserService(CognitoIdentityProviderClient cognitoClient) {
        this.cognitoClient = cognitoClient;
        this.userPoolId = System.getenv("USER_POOL_ID");
    }

    /**
     * Lists Cognito users with pagination. Returns a map with 'items' and 'nextToken'.
     */
    public Map<String, Object> listUsers(Map<String, Object> arguments) {
        int limit = arguments.containsKey("limit") ? (int) arguments.get("limit") : 25;
        String paginationToken = (String) arguments.get("nextToken");

        ListUsersRequest.Builder reqBuilder = ListUsersRequest.builder()
                .userPoolId(userPoolId)
                .limit(limit);

        if (paginationToken != null && !paginationToken.isEmpty()) {
            reqBuilder.paginationToken(paginationToken);
        }

        ListUsersResponse response = cognitoClient.listUsers(reqBuilder.build());

        List<Map<String, Object>> items = new ArrayList<>();
        for (UserType user : response.users()) {
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("username", user.username());
            userMap.put("status", user.userStatusAsString());
            userMap.put("createdAt", user.userCreateDate() != null ? user.userCreateDate().toString() : null);

            // Extract attributes
            for (AttributeType attr : user.attributes()) {
                if ("email".equals(attr.name()))    userMap.put("email", attr.value());
                if ("nickname".equals(attr.name())) userMap.put("name", attr.value());
            }

            // Check if user is in ADMIN group
            boolean isAdmin = false;
            try {
                AdminListGroupsForUserResponse groupsResponse = cognitoClient.adminListGroupsForUser(
                        AdminListGroupsForUserRequest.builder()
                                .userPoolId(userPoolId)
                                .username(user.username())
                                .build()
                );
                isAdmin = groupsResponse.groups().stream()
                        .anyMatch(g -> "ADMIN".equals(g.groupName()));
            } catch (Exception e) {
                logger.warn("Could not fetch groups for user {}: {}", user.username(), e.getMessage());
            }
            userMap.put("isAdmin", isAdmin);
            items.add(userMap);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("items", items);
        result.put("nextToken", response.paginationToken());
        return result;
    }

    /**
     * Adds or removes a user from the ADMIN Cognito group.
     */
    public boolean setAdminRole(Map<String, Object> arguments, boolean callerIsAdmin) {
        if (!callerIsAdmin) {
            throw new SecurityException("Only admins can assign roles.");
        }

        String username = (String) arguments.get("username");
        boolean makeAdmin = (boolean) arguments.get("isAdmin");

        try {
            if (makeAdmin) {
                cognitoClient.adminAddUserToGroup(AdminAddUserToGroupRequest.builder()
                        .userPoolId(userPoolId)
                        .username(username)
                        .groupName("ADMIN")
                        .build());
                logger.info("Granted ADMIN role to user: {}", username);
            } else {
                cognitoClient.adminRemoveUserFromGroup(AdminRemoveUserFromGroupRequest.builder()
                        .userPoolId(userPoolId)
                        .username(username)
                        .groupName("ADMIN")
                        .build());
                logger.info("Revoked ADMIN role from user: {}", username);
            }
            return true;
        } catch (Exception e) {
            logger.error("Failed to update admin role for {}: {}", username, e.getMessage());
            return false;
        }
    }
}
