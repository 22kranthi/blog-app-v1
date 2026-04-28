# Blog Application Implementation Summary

This document provides a comprehensive overview of the features and security measures successfully implemented in the Blog Application.

## 1. Backend Architecture (AWS Serverless)
- **Framework**: Java 17 with Spring Cloud Function and Spring Boot.
- **API**: AWS AppSync (GraphQL) for efficient data retrieval.
- **Database**: Amazon DynamoDB with a single-table design.
- **Storage**: Amazon S3 for blog image hosting.
- **Compute**: AWS Lambda with SnapStart enabled for reduced cold starts.

## 2. Core Blog Features
- **Blog Management**: Full CRUD (Create, Read, Update, Delete) operations.
- **AI Integration**: Automatic generation of two-sentence blog summaries using **Amazon Bedrock (Llama 3.1 8B)**.
- **Image Handling**: Secure image uploads via S3 Presigned URLs.
- **Author Identity**: Automatic tracking of blog authors via Cognito User Pool identities.

## 3. Database Performance & Optimization
- **Query over Scan**: Replaced expensive full-table scans with high-performance **DynamoDB Queries**.
- **Global Secondary Index (GSI)**: Implemented `StatusIndex` for fast retrieval of "PUBLISHED" blogs.
- **Automated Sorting**: Blogs are automatically sorted by `createdAt` (newest first) at the database level.
- **Pagination**: Implemented efficient "Load More" pagination using `ExclusiveStartKey` (backend) and `nextToken` (frontend).

## 4. Security & Hardening
- **Access Control**: Role-based permissions ensuring only the original author or an 'admin' can Edit/Delete blogs.
- **S3 Image Cleanup**: Automatic deletion of images from S3 when a blog is deleted or when its image is replaced.
- **DynamoDB Security**: Enabled **Point-in-Time Recovery (PITR)** and **Server-Side Encryption (SSE)**.
- **S3 Security**: Enabled **AES256 Encryption** for the blog image bucket.
- **Efficient Updates**: Optimized the backend to use `UpdateItem` instead of full-row overwrites.

## 5. Frontend Features & Architecture
- **State Management (NgRx)**: 
  - Centralized all blog logic into a clean Store/Effect/Selector pattern.
  - Eliminated logic duplication in components.
  - Implemented complex state handlers for appending paginated data.
- **Specific Views**:
  - **Admin Dashboard**: Centralized view for administrators to manage all content.
  - **My Blogs**: Personalized view for users to manage their own contributions.
- **Navigation & Discovery**:
  - **Category Filtering**: Dynamic UI buttons that allow users to filter the feed by category (Technology, Lifestyle, etc.).
- **Modern UI**: Professional, minimalist design with a responsive "Masonry" style grid.
- **User Feedback**: 
  - **Snackbar Notifications**: Real-time feedback for all actions (Success/Error).
  - **Skeleton Loaders**: Polished "loading" states for the home page.
- **Error Handling**: Custom "Not Found" (404) page for missing or deleted blog posts.

## 6. Technical Bug Fixes & Refinements
- **DynamoDB Reserved Keywords**: Resolved a critical crash caused by the `status` keyword by implementing `#s` expression attribute aliasing.
- **Cognito Group Parsing**: Robust `isAdmin` logic that correctly handles different formats of Cognito group claims (JSON arrays vs. strings).
- **Deployment Optimization**: Correctly configured the SAM template to handle Maven JAR packaging and Spring Cloud Function routing.

## 7. Deep Infrastructure & Security
- **Bedrock Regional Routing**: Successfully implemented a "Cross-Region" AI architecture where the database resides in **ap-south-2 (Hyderabad)** but AI calls are routed to **us-east-1** to leverage the latest Llama models.
- **IAM Policy Hardening**: Manually expanded the Lambda execution role with specific `s3:DeleteObject` permissions to enable secure file cleanup.
- **Inference Profile Optimization**: Configured the backend to use the **US Inference Profile ID** (`us.meta.llama3-1-8b-instruct-v1:0`) to resolve AWS "On-Demand Throughput" errors.
- **S3 Object Security**: Configured the `S3Service` to sanitize filenames and generate secure presigned URLs to prevent directory traversal or file injection attacks.

## 8. Git & Environment Safety
- **Git Security**: Comprehensive `.gitignore` configuration ensuring no build artifacts (`target/`, `.aws-sam/`) or local secrets (`.env`) are committed.
- **Environment Management**: Clean separation of environment variables in the SAM template for easier cross-region deployment.
