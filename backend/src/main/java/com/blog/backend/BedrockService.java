package com.blog.backend;

import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelRequest;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BedrockService {

    private final BedrockRuntimeClient bedrockClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    // Use Claude 3.5 Sonnet - likely available via cross-region inference or in major regions
    private final String modelId = "anthropic.claude-3-5-sonnet-20240620-v1:0";

    public BedrockService(BedrockRuntimeClient bedrockClient) {
        this.bedrockClient = bedrockClient;
    }

    public String generateSummary(String content) {
        try {
            System.out.println("Generating AI summary for content length: " + content.length());
            
            String prompt = "Please summarize the following blog content in exactly two sentences:\n\n" + content;
            
            // Constructing a proper Claude 3 Messages API payload
            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);

            Map<String, Object> payloadMap = new HashMap<>();
            payloadMap.put("anthropic_version", "bedrock-2023-05-31");
            payloadMap.put("max_tokens", 300);
            payloadMap.put("messages", List.of(message));
            payloadMap.put("temperature", 0.5);

            String payload = objectMapper.writeValueAsString(payloadMap);
            
            InvokeModelRequest request = InvokeModelRequest.builder()
                    .modelId(modelId)
                    .contentType("application/json")
                    .accept("application/json")
                    .body(SdkBytes.fromUtf8String(payload))
                    .build();

            InvokeModelResponse response = bedrockClient.invokeModel(request);
            String responseBody = response.body().asUtf8String();
            
            JsonNode jsonNode = objectMapper.readTree(responseBody);
            // Claude 3 Messages API response structure
            return jsonNode.get("content").get(0).get("text").asText().trim();
        } catch (Exception e) {
            System.err.println("Bedrock error: " + e.getMessage());
            e.printStackTrace();
            return "AI summary not available at this time.";
        }
    }
}
