package com.blog.backend;

import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelRequest;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashMap;
// import java.util.List;
import java.util.Map;

@Service
public class BedrockService {

    private final BedrockRuntimeClient bedrockClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    // Use the US Inference Profile ID for Llama 3.1 8B (fixes the 'on-demand throughput' error)
    // Use the OpenAI GPT-OSS 20B model as requested
    private final String modelId = "openai.gpt-oss-20b-1:0";

    public BedrockService(BedrockRuntimeClient bedrockClient) {
        this.bedrockClient = bedrockClient;
    }

    public String generateSummary(String content) {
        try {
            System.out.println("Generating AI summary using OpenAI GPT-OSS 20B. Content length: " + content.length());
            
            // Re-adding the strict instruction to prevent the model from being chatty
            String prompt = "Summarize the following blog content in exactly two sentences. Output ONLY the two sentences. No preamble, no reasoning tags, and no introduction. text:\n\n" + content;
            
            // OpenAI models require the 'messages' array format
            Map<String, Object> payloadMap = new HashMap<>();
            Map<String, String> userMessage = new HashMap<>();
            userMessage.put("role", "user");
            userMessage.put("content", prompt);
            
            payloadMap.put("messages", java.util.List.of(userMessage));
            payloadMap.put("max_tokens", 300);
            payloadMap.put("temperature", 0.1); // Lowering temperature for more direct answers

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
            
            String result = "";
            // Standard OpenAI chat response parsing
            if (jsonNode.has("choices") && jsonNode.get("choices").isArray() && jsonNode.get("choices").size() > 0) {
                JsonNode firstChoice = jsonNode.get("choices").get(0);
                if (firstChoice.has("message")) {
                    result = firstChoice.get("message").get("content").asText().trim();
                }
            }
            
            // Fallback for other formats
            if (result.isEmpty() && jsonNode.has("completion")) result = jsonNode.get("completion").asText().trim();
            if (result.isEmpty() && jsonNode.has("text")) result = jsonNode.get("text").asText().trim();
            
            // REGEX to strip any <reasoning>...</reasoning> tags if they still appear
            return result.replaceAll("(?s)<reasoning>.*?</reasoning>", "").trim();
        } catch (Exception e) {
            System.err.println("Bedrock error: " + e.getMessage());
            e.printStackTrace();
            return "AI summary not available at this time.";
        }
    }
}
