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
    private final String modelId = "us.meta.llama3-1-8b-instruct-v1:0";

    public BedrockService(BedrockRuntimeClient bedrockClient) {
        this.bedrockClient = bedrockClient;
    }

    public String generateSummary(String content) {
        // Force deployment ID: 2026-04-26-v3-LLAMA
        try {
            System.out.println("Generating AI summary using Llama 3.1 8B. Content length: " + content.length());
            
            String prompt = "Summarize the following blog content in exactly two sentences. Output ONLY the two sentences. Do not include any preamble, steps, or 'Final Answer' text:\n\n" + content;
            
            // Constructing a Llama 3 specific payload
            Map<String, Object> payloadMap = new HashMap<>();
            payloadMap.put("prompt", prompt);
            payloadMap.put("max_gen_len", 300);
            payloadMap.put("temperature", 0.5);
            payloadMap.put("top_p", 0.9);

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
            // Llama 3 response structure uses 'generation'
            return jsonNode.get("generation").asText().trim();
        } catch (Exception e) {
            System.err.println("Bedrock error: " + e.getMessage());
            e.printStackTrace();
            return "AI summary not available at this time.";
        }
    }
}
