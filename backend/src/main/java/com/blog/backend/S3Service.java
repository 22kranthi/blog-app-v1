package com.blog.backend;

import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
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
    private final S3Client s3Client;
    private final String bucketName = System.getenv().getOrDefault("S3_BUCKET_NAME", "BlogImageBucket");

    public S3Service(S3Presigner s3Presigner, S3Client s3Client) {
        this.s3Presigner = s3Presigner;
        this.s3Client = s3Client;
    }

    public void deleteFileFromUrl(String imageUrl) {
        if (imageUrl == null || !imageUrl.contains(bucketName)) {
            return;
        }

        try {
            // Extract key from URL (everything after the bucket name)
            // Example: https://bucket.s3.region.amazonaws.com/uploads/user/file.jpg
            String key = imageUrl.substring(imageUrl.indexOf(".com/") + 5);
            
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();
            
            s3Client.deleteObject(deleteRequest);
        } catch (Exception e) {
            // Log but don't fail the blog deletion if S3 deletion fails
            System.err.println("Failed to delete S3 object: " + imageUrl);
        }
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
