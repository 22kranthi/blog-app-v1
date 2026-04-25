package com.blog.backend;

import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.UUID;

@Service
public class S3Service {

    private static final int MAX_FILENAME_LENGTH = 200;

    private final S3Presigner s3Presigner;
    private final String bucketName = System.getenv().getOrDefault("S3_BUCKET_NAME", "BlogImageBucket");

    public S3Service(S3Presigner s3Presigner) {
        this.s3Presigner = s3Presigner;
    }

    public String generatePresignedUrl(String filename, String contentType, String userId) {
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("userId is required");
        }
        if (filename == null || filename.isBlank()) {
            throw new IllegalArgumentException("filename is required");
        }
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image/* content types are allowed");
        }

        String safeName = filename.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (safeName.contains("..") || safeName.startsWith(".") || safeName.length() > MAX_FILENAME_LENGTH) {
            throw new IllegalArgumentException("Invalid filename");
        }
        String safeUser = userId.replaceAll("[^a-zA-Z0-9_-]", "_");
        String key = "uploads/" + safeUser + "/" + UUID.randomUUID() + "-" + safeName;

        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .putObjectRequest(objectRequest)
                .build();

        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);
        return presignedRequest.url().toString();
    }
}
