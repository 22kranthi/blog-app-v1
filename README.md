# Modern Source — AI-Powered Serverless Blog Platform

A full-stack, production-grade blog platform built on a modern serverless architecture. It features AI-generated content summaries, a reactive Angular frontend with full NgRx state management, a role-based admin dashboard, and a Java-based AWS Lambda backend integrated with DynamoDB, S3, Cognito, and Amazon Bedrock.

---

## ✨ Features

### 📝 Blog Experience
- **Full CRUD** — Create, read, update, and delete posts with multi-category tagging
- **AI-Generated Summaries** — Amazon Bedrock (Meta Llama 3.1) auto-generates a two-sentence summary for every published post
- **Reading Progress Bar** — Thin progress indicator at the top of each article tracks scroll position
- **Estimated Reading Time** — Calculated on the fly (`words ÷ 200 wpm`) and displayed on every card and detail page
- **Paragraph Rendering** — Blog content is split on `\n\n` into separate `<p>` blocks for readable formatting
- **Copy Link Button** — Floating action button on article pages copies the URL to clipboard with a snackbar confirmation
- **Back to Top Button** — Appears after scrolling 300px; smooth-scrolls back to the top
- **Skeleton Loaders** — Shimmer-gradient loading placeholders match the exact grid layout to prevent layout shift

### 🔍 Discovery & Navigation
- **Category Pill Filter** — Animated sliding active-state indicator; horizontally scrollable on mobile with a hidden scrollbar
- **Auto-Hiding Filter Bar** — Filter bar disappears when no categories exist to prevent empty UI chrome
- **Load More Pagination** — Cursor-based (`ExclusiveStartKey`) pagination appends posts into the existing list without a page reload
- **Sticky Navbar** — Backdrop-blur navbar locks in place on scroll; mobile version includes a slide-out drawer

### 🔐 Authentication
- **Smart Login Modal** — Glassmorphic modal intercepts unauthorized routes, saves the intended URL, and auto-redirects after login — no page reload, no lost context
- **AWS Cognito Integration** — Handles sign-up, sign-in, forgot password, and email confirmation flows
- **Role-Based Guards** — `authGuard` for authenticated routes, `adminGuard` for the admin panel

### 🛠️ Blog Editor
- **3-Step Wizard** — Details → Write → Preview
- **Live Word Count & Reading Time** — Updates in real time as you type
- **Preview Step** — Step 3 renders the article exactly as it will appear in the detail view
- **Draft Auto-Save** — Drafts are saved to `localStorage` scoped by `userId` to prevent content leaking between users
- **Cover Image Upload** — Secure presigned S3 URL upload with progress feedback
- **Publish Confirmation** — Confirmation prompt before submitting to prevent accidental publishes

### 🧑‍💻 Admin Dashboard
Accessible at `/admin` (requires admin Cognito group). Fully mobile-responsive with a slide-out sidebar drawer on phones.

| Section | Features |
|---|---|
| **Overview** | Stat cards (Total Posts, Total Authors, Published This Month, AI Summaries); Recent Posts list |
| **Content Management** | Full posts table with search, sortable columns, status badges, bulk checkbox selection, bulk delete, export CSV/JSON, edit/delete actions |
| **User Management** | Cognito user list with status chips, role badges, grant/revoke admin toggle, search |
| **Analytics** | Placeholder (roadmap) |

### 📱 Responsive Design
- Hamburger menu with slide-out drawer on mobile
- Admin tables transform into card decks on screens under 768px (headers hidden, pseudo-element labels injected for context)
- Blog editor toolbar stacks vertically on small screens; buttons use equal-width grid layout
- All touch targets sized for 38–44px minimum height

### 🔔 User Feedback
- **Snackbar Notifications** — Animated success/error toasts for all async actions
- **Dynamic Page Titles** — Angular `Title` service updates the browser tab on every route (SEO-friendly)
- **404 Page** — Custom not-found component with navigation back to home

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        Frontend                           │
│  Angular 19+ · NgRx · Standalone Components              │
│  AWS Amplify (GraphQL client + Auth UI)                   │
└────────────────────────┬─────────────────────────────────┘
                         │ GraphQL (AppSync)
┌────────────────────────▼─────────────────────────────────┐
│                      AWS AppSync                          │
│  GraphQL API · Cognito Auth · API Key (guest)            │
└────────────────────────┬─────────────────────────────────┘
                         │ Lambda Proxy
┌────────────────────────▼─────────────────────────────────┐
│                    AWS Lambda                             │
│  Java 17 · Spring Cloud Function · SnapStart enabled     │
│                                                           │
│  ┌──────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ BlogService  │  │ BedrockService  │  │  S3Service  │  │
│  │ UserService  │  │ (AI Summaries)  │  │ (Presigned) │  │
│  └──────┬───────┘  └─────────────────┘  └─────────────┘  │
│         │                                                 │
│  ┌──────▼────────────────────────────────────────────┐   │
│  │              BlogRepository                       │   │
│  │  DynamoDB single-table · Adjacency List pattern   │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Backend Stack
| Layer | Technology |
|---|---|
| Language | Java 17 |
| Framework | Spring Boot + Spring Cloud Function |
| Deploy | AWS SAM (CloudFormation) |
| API | AWS AppSync (GraphQL) |
| Compute | AWS Lambda with SnapStart |
| Database | Amazon DynamoDB (single-table design) |
| Storage | Amazon S3 |
| AI | Amazon Bedrock — OpenAI GPT-OSS 20B (`openai.gpt-oss-20b-1:0`) |
| Auth | Amazon Cognito User Pools |

### Frontend Stack
| Layer | Technology |
|---|---|
| Framework | Angular 19+ (Standalone Components, new control flow) |
| State | NgRx Store · Effects · Selectors |
| Auth | AWS Amplify UI Angular (`@aws-amplify/ui-angular`) |
| Styling | Vanilla CSS with design tokens (CSS custom properties) |
| Build | Angular CLI |

### Backend Package Structure
```
com.blog.backend/
├── config/          # Lambda function routing (BlogFunctionConfig)
├── model/           # Blog POJO / DynamoDB entity
├── repository/      # BlogRepository — DynamoDB queries only
├── service/
│   ├── BlogService.java     # Business logic, orchestration
│   ├── BedrockService.java  # AI summary generation
│   ├── S3Service.java       # Presigned URL generation, cleanup
│   └── UserService.java     # Cognito AdminListUsers
└── util/            # TokenSerializer (pagination cursor encode/decode)
```

---

## 🗄️ Database Design

Single-table DynamoDB with the **Adjacency List pattern** for multi-category indexing.

| Item Type | PK | SK | GSI PK (`StatusIndex`) |
|---|---|---|---|
| Blog metadata | `BLOG#<id>` | `META` | `STATUS#PUBLISHED` |
| Category mapping | `BLOG#<id>` | `CAT#<CATEGORY>` | `CAT#<CATEGORY>` |

- `StatusIndex` GSI enables O(1) queries for "all published blogs" and "all blogs in category X"
- A `type` attribute (`BLOG` vs `CAT_MAP`) prevents category mapping items from appearing in the home feed
- Pagination uses `ExclusiveStartKey` on the backend serialized into a Base64 token (`TokenSerializer`) and passed as `nextToken` on the frontend

---

## 🛡️ Security

- **Role-Based Access Control** — Only the original author or an `admin` group member can edit/delete a post
- **Draft Scoping** — Auto-saved drafts are keyed by `userId` in `localStorage` to prevent data leaking between users on shared browsers
- **S3 Security** — Presigned URLs expire after 60 seconds; filenames are sanitized to prevent directory traversal
- **DynamoDB Hardening** — Point-in-Time Recovery (PITR) and Server-Side Encryption (SSE) enabled
- **S3 Bucket Encryption** — AES-256 server-side encryption enabled
- **IAM Least Privilege** — Lambda execution role has only the minimum required permissions per service
- **Bedrock Permission Scoping** — IAM restricted to the specific Bedrock inference profile ARN

---

## 🚀 Getting Started

### Prerequisites
- AWS CLI & SAM CLI installed and configured
- Maven 3.8+
- Node.js 18+ & Angular CLI

### Backend Setup

```bash
cd backend/

# Build the JAR
mvn clean package

# Deploy to AWS (first time — prompts for parameter values)
sam build
sam deploy --guided

# Subsequent deploys
sam build && sam deploy
```

After deployment, note the AppSync endpoint, API key, and Cognito Pool ID from the SAM output — you will need these for the frontend environment.

### Frontend Setup

```bash
cd frontend/

# Install dependencies
npm install

# Configure environment (copy template and fill in your AWS values)
cp src/environments/environment.example.ts src/environments/environment.ts
# Open environment.ts and fill in: appsyncUrl, appsyncApiKey, cognitoUserPoolId, cognitoClientId, s3BucketName, awsRegion

# Start development server
npm start
```

Open `http://localhost:4200/` in your browser.

---

## 📁 Project Structure

```
blog-app-v1/
├── backend/                    # Java Spring Boot Lambda
│   ├── src/main/java/...
│   ├── template.yaml           # AWS SAM infrastructure definition
│   └── pom.xml
├── frontend/                   # Angular application
│   └── src/app/
│       ├── admin-dashboard/    # Admin shell, overview, content, users
│       ├── blog-detail/        # Article view (progress bar, copy link, back-to-top)
│       ├── blog-form/          # 3-step editor with live preview and draft auto-save
│       ├── blog-list/          # Home feed with category filter and skeleton loaders
│       ├── my-blogs/           # Author's personal post management view
│       ├── store/              # NgRx actions, reducer, effects, selectors
│       ├── auth.service.ts     # Cognito session management
│       ├── auth.guard.ts       # Route guards (authGuard, adminGuard)
│       ├── blog.service.ts     # AppSync GraphQL calls
│       └── notification.service.ts
└── docs/
    └── project_audit.md        # Full bug log, roadmap, and improvement backlog
```

---

## 📜 Additional Docs

| File | Purpose |
|---|---|
| [`IMPLEMENTATION_SUMMARY.md`](./IMPLEMENTATION_SUMMARY.md) | Detailed list of every feature and technical decision |
| [`docs/project_audit.md`](./docs/project_audit.md) | Bug log, security findings, and priority roadmap |
| [`RUN.md`](./RUN.md) | Step-by-step local run guide |
