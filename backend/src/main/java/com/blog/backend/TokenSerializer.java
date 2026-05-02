package com.blog.backend;

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
                .map(e -> e.getKey() + ":" + e.getValue().s())
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
            String[] kv = part.split(":", 2);
            if (kv.length == 2) {
                key.put(kv[0], AttributeValue.builder().s(kv[1]).build());
            }
        }
        return key;
    }
}
