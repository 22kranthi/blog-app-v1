# AI-Powered Serverless Blog Platform

A professional, high-performance blog application built with a modern serverless architecture. This project features AI-driven content enhancement, a secure cloud backend, and a reactive frontend.

## 🚀 Key Features

- **AI-Driven Content**: Automatic generation of blog summaries using **Amazon Bedrock (Llama 3.1 8B)**.
- **Serverless Backend**: Built with **Java 17**, **Spring Cloud Function**, and **AWS SAM**.
- **Reactive Frontend**: Built with **Angular** and **NgRx** for predictable state management.
- **Secure Image Hosting**: Managed via **Amazon S3** with automatic cleanup logic.
- **Optimized Data Layer**: High-performance **DynamoDB** queries with GSI indexing and pagination.
- **Cloud Native**: Integrated with **AWS AppSync (GraphQL)** and **Cognito** for secure authentication.

## 🏗️ Architecture

- **Frontend**: Angular 19+, NgRx Store/Effects, Tailwind CSS (minimal).
- **Backend**: Java 17, Spring Boot (Serverless adapter).
- **Infrastructure**: 
  - **AWS Lambda**: SnapStart enabled for fast performance.
  - **Amazon DynamoDB**: PITR and SSE enabled.
  - **Amazon Bedrock**: Multi-region routing for AI generation.

## 🛠️ Getting Started

### Prerequisites
- AWS CLI & SAM CLI
- Maven 3.8+
- Node.js & Angular CLI

### Backend Setup
1. Navigate to the `backend/` directory.
2. Build the package:
   ```bash
   mvn clean package
   ```
3. Deploy to AWS:
   ```bash
   sam build
   sam deploy
   ```

### Frontend Setup
1. Navigate to the `frontend/` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. **Configure Environment**:
   - Copy the template file: `cp src/environments/environment.example.ts src/environments/environment.ts`
   - Open `src/environments/environment.ts` and fill in your specific AWS IDs (from the SAM deployment output).
4. Run the development server:
   ```bash
   npm start
   ```
4. Access the app at `http://localhost:4200/`.

## 🛡️ Security & Performance
- **IAM Hardening**: Least-privilege access for all Lambda functions.
- **Point-in-Time Recovery**: Enabled for all database tables.
- **GSI Pagination**: Compound token logic for efficient data fetching.
- **Reserved Keyword Handling**: Custom aliasing for DynamoDB reserved words.

## 📜 Implementation Details
For a detailed list of every technical win and implemented feature, refer to the [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md).
