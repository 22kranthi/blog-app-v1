package com.blog.backend;

import java.util.Map;

public class AppSyncEvent {
    private Map<String, Object> arguments;
    private Info info;
    private Identity identity;

    public Map<String, Object> getArguments() { return arguments; }
    public void setArguments(Map<String, Object> arguments) { this.arguments = arguments; }

    public Info getInfo() { return info; }
    public void setInfo(Info info) { this.info = info; }

    public Identity getIdentity() { return identity; }
    public void setIdentity(Identity identity) { this.identity = identity; }

    public static class Info {
        private String fieldName;
        private String parentTypeName;

        public String getFieldName() { return fieldName; }
        public void setFieldName(String fieldName) { this.fieldName = fieldName; }

        public String getParentTypeName() { return parentTypeName; }
        public void setParentTypeName(String parentTypeName) { this.parentTypeName = parentTypeName; }
    }

    public static class Identity {
        private String username;
        private Map<String, Object> claims;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }

        public Map<String, Object> getClaims() { return claims; }
        public void setClaims(Map<String, Object> claims) { this.claims = claims; }
    }
}
