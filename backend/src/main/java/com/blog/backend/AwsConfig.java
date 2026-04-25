package com.blog.backend;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class AwsConfig {

    @Bean
    public DynamoDbClient dynamoDbClient() {
        String region = System.getenv().getOrDefault("AWS_REGION", "ap-south-2");
        return DynamoDbClient.builder()
                .region(Region.of(region))
                .build();
    }

    @Bean
    public BedrockRuntimeClient bedrockRuntimeClient() {
        String region = System.getenv().getOrDefault("BEDROCK_REGION", "us-east-1");
        return BedrockRuntimeClient.builder()
                .region(Region.of(region))
                .build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        String region = System.getenv().getOrDefault("AWS_REGION", "ap-south-2");
        return S3Presigner.builder()
                .region(Region.of(region))
                .build();
    }
}
