package com.blog.backend.util;

import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

public class TokenSerializer {

    public static String serialize(Map<String, AttributeValue> lastEvaluatedKey) {
        if (lastEvaluatedKey == null || lastEvaluatedKey.isEmpty()) {
            return null;
        }
        String serialized = lastEvaluatedKey.entrySet().stream()
                .map(e -> {
                    String type = e.getValue().s() != null ? "S" : (e.getValue().n() != null ? "N" : "UNKNOWN");
                    String val = "S".equals(type) ? e.getValue().s() : e.getValue().n();
                    return e.getKey() + ":" + type + ":" + val;
                })
                .collect(Collectors.joining("|"));
        return Base64.getEncoder().encodeToString(serialized.getBytes());
    }

    public static Map<String, AttributeValue> deserialize(String token) {
        if (token == null || token.isEmpty()) {
            return null;
        }
        String decoded = new String(Base64.getDecoder().decode(token));
        Map<String, AttributeValue> key = new HashMap<>();
        String[] parts = decoded.split("\\|");
        for (String part : parts) {
            String[] kv = part.split(":", 3);
            if (kv.length == 3) {
                String k = kv[0];
                String type = kv[1];
                String val = kv[2];
                if ("S".equals(type)) {
                    key.put(k, AttributeValue.builder().s(val).build());
                } else if ("N".equals(type)) {
                    key.put(k, AttributeValue.builder().n(val).build());
                } else {
                    key.put(k, AttributeValue.builder().s(val).build()); // Fallback
                }
            } else if (kv.length == 2) {
                // Backwards compatibility for old tokens (which were just key:value)
                key.put(kv[0], AttributeValue.builder().s(kv[1]).build());
            }
        }
        return key;
    }
}
