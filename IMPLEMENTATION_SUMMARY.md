# Blog Application — Implementation Summary

This document is a comprehensive record of every feature, architectural decision, and technical fix implemented in the Modern Source blog platform.

---

## 1. Backend Architecture (AWS Serverless)

- **Language**: Java 17 with Spring Boot 3.2.4
- **Compute**: AWS Lambda with **SnapStart** enabled — JVM snapshot reuse dramatically reduces cold start latency
- **Function Routing**: Spring Cloud Function adapter — a single Lambda handles all 10+ AppSync GraphQL operations via field-name routing in `BlogFunctionConfig`
- **API Layer**: AWS AppSync (GraphQL) with dual auth — Cognito User Pool (mutations + auth queries) + API Key (guest read access)
- **Database**: Amazon DynamoDB (single-table design) with three GSIs
- **Storage**: Amazon S3 for blog cover images with AES-256 server-side encryption
- **AI**: Amazon Bedrock — **OpenAI GPT-OSS 20B** (`openai.gpt-oss-20b-1:0`) for auto-generating 2-sentence editorial summaries
- **Auth**: Amazon Cognito User Pools — handles sign-up, sign-in, email verification, and group-based role assignment
- **IaC**: AWS SAM (CloudFormation) — all resources defined in `template.yaml`, deployed with `sam deploy`

---

## 2. Architecture Separation (BlogService Layer)

The original design had all business logic inside `BlogFunctionConfig` (the Lambda router). This was refactored to enforce single-responsibility:

- **`BlogFunctionConfig`** — Only routes GraphQL `fieldName` → service method. Zero business logic.
- **`BlogService`** — Owns all business rules: ownership checks, AI orchestration, S3 cleanup coordination, timestamp management.
- **`BlogRepository`** — Owns only DynamoDB. No S3 or Bedrock dependencies.
- **`UserService`** — Owns Cognito Admin API calls (`AdminListUsers`, `AdminAddUserToGroup`, `AdminRemoveUserFromGroup`).
- **`BedrockService`** — Owns AI inference. Isolated to one service; never called directly from the repository.
- **`S3Service`** — Owns presigned URL generation and image deletion. Called only from `BlogService`.

---

## 3. Core Blog Features

- **Full CRUD**: Create, Read, Update, Delete blog posts with multi-category support
- **AI-Generated Summaries**: On every `createBlog` and `updateBlog` (when content changes), `BedrockService.generateSummary()` is called synchronously — returns exactly 2 editorial sentences; stored in `summary_ai` field on both the METADATA item and all CATEGORY mapping items
- **Image Handling**: Secure cover image uploads via S3 Presigned PUT URLs (15-minute TTL); browser uploads directly to S3 — bypasses Lambda's 6MB payload limit; permanent URL extracted by stripping query params
- **Author Tracking**: `authorId` extracted from Cognito JWT identity on every write operation — authors cannot forge attribution
- **AI on Updates**: AI summary is regenerated only if `content` actually changed on update — prevents unnecessary Bedrock calls
- **Old Image Cleanup**: When a blog's cover image is replaced, `S3Service.deleteFileFromUrl()` cleans up the old S3 object automatically

---

## 4. Database Performance & Optimization

- **Single-Table Design**: All blog data (metadata + category mappings) stored in one DynamoDB table with composite keys (`PK`, `SK`)
- **Adjacency List Pattern**: Each blog stores a METADATA item (`PK=BLOG#id, SK=METADATA`) plus one CATEGORY mapping item per category (`PK=CATEGORY#<name>, SK=<createdAt>#BLOG#<id>`) — enables O(1) category queries without full-table scans
- **Three GSIs**:
  - `StatusIndex` — home feed (all `PUBLISHED` blogs sorted by `createdAt`)
  - `CategoryIndex` — category filter (all blogs under a given category)
  - `AuthorIndex` — author feed / my-blogs (all blogs by a given `authorId`)
- **Denormalization**: Category mapping items include a full copy of blog metadata (title, authorId, authorName, summary_ai, categories) — resolves GraphQL null errors without secondary lookups
- **Type Filtering**: A `type` attribute (`BLOG` vs `CAT_MAP`) on every item prevents category mappings from appearing in the home feed
- **Automated Sorting**: Blogs sorted by `createdAt` descending at the DynamoDB level (`ScanIndexForward: false`)
- **Cursor-Based Pagination**: `ExclusiveStartKey` encoded to a Base64 token (`TokenSerializer`) → passed as opaque `nextToken` through GraphQL

---

## 5. Security & Hardening

- **Role-Based Access Control**: Only the original author (`authorId === username`) or a Cognito `ADMIN` group member can edit or delete a blog
- **Admin Group Parsing**: `BlogService.isAdminIdentity()` correctly handles both `List<String>` and comma-separated/JSON-serialized `String` formats of the `cognito:groups` claim
- **Draft Privacy**: Auto-saved drafts in `localStorage` are keyed by `userId` (`draft_${userId}_new`, `draft_${userId}_<id>`) — prevents content from leaking to another user who logs in on the same browser
- **S3 Image Cleanup**: Images deleted on blog delete and on image replacement — no orphaned objects accumulate
- **Filename Sanitization**: `S3Service` strips special characters, blocks `..` path traversal, adds UUID prefix — prevents directory traversal and filename collision attacks
- **DynamoDB Security**: PITR (Point-in-Time Recovery) and SSE (Server-Side Encryption) enabled on the table
- **S3 Security**: AES-256 server-side encryption on the image bucket; public read only on `uploads/*` prefix
- **IAM Least Privilege**: Lambda execution role scoped to specific DynamoDB table ARN, S3 bucket ARN, and Bedrock model ARN — not wildcard resource access
- **Efficient Updates**: DynamoDB `UpdateItem` used for updates (not full-row overwrite `PutItem`) — reduces unnecessary write capacity consumption

---

## 6. Admin Dashboard

A full administration panel accessible at `/admin` (requires Cognito `ADMIN` group membership).

### Admin Shell
- Persistent sidebar navigation on desktop with links to all admin sections
- On mobile: transforms into a fixed slide-out drawer with a hamburger toggle button (animated hamburger → X)
- Backdrop overlay on mobile dismisses the drawer on click
- Sidebar footer: avatar, display name, Administrator label, Log out button
- Routing: nested under `AdminShell` with child routes for Overview, Content, Users, Analytics

### Admin Overview
- Four live stat cards derived from NgRx store:
  - **Total Posts** — `blogs.length`
  - **Total Authors** — unique `authorId` count via `Set`
  - **Published This Month** — filter by current month/year of `createdAt`
  - **With AI Summaries** — filter `!!summary_ai`
- Recent Posts table showing the 5 latest posts, linked to their detail views

### Admin Content Management (`/admin/content`)
- Full posts table with **search** (across title, author, categories), **sortable columns** (Title, Author, Date, Categories), and **status badges** (Published, Draft, Flagged, Unpublished)
- **Bulk checkbox selection** — select all / deselect all / individual rows
- **Bulk delete** with confirmation dialog
- **Export CSV** and **Export JSON** — downloads the current filtered + sorted view as a file
- **Load More** pagination (`limit: 25` per page)
- On mobile: table rows convert to card decks with `::before` pseudo-element labels

### Admin User Management (`/admin/users`)
- Lists all Cognito users via `UserService.listUsers()` → `CognitoIdentityProviderClient.listUsers()`
- Displays avatar (initials), display name, email, confirmation status chip, role badge (Admin / User), join date
- **Search** across name, email, username (local filter)
- **Grant / Revoke Admin**: calls `setAdminRole` mutation → Lambda `UserService.setAdminRole()` → `AdminAddUserToGroup` or `AdminRemoveUserFromGroup` — optimistic UI update with per-row loading spinner
- Load More pagination

---

## 7. Frontend Features & Architecture

- **Framework**: Angular 19+ using Standalone Components and the new `@if`/`@for` control flow syntax
- **State Management (NgRx)**: Centralized Store / Effects / Selectors; optimistic updates for delete and update; clean pagination append logic (`loadMoreBlogsSuccess`)
- **Smart Authentication**: Context-preserving glassmorphic login modal — saves the target URL, intercepts unauthorized routes, auto-redirects on successful login. No context-breaking redirects.
- **Route Guards**: `authGuard` (authenticated routes) + `adminGuard` (admin group only) — both use Angular Signals via `AuthService`

### Article Detail Page
- **Reading Progress Bar**: Thin indigo bar at top of viewport; width tracks `window.scrollY` as a percentage of page height
- **Back to Top Button**: Floating button appears after 300px scroll; smooth-scrolls to top with fallback for older mobile browsers
- **Copy Link Button**: Floating action button; uses `navigator.clipboard.writeText()` with `execCommand` fallback for older browsers; snackbar confirmation
- **Paragraph Rendering**: Blog content split on `\n\n` into separate `<p>` elements for clean reading layout
- **Reading Time**: Displayed on both feed cards and detail pages (`Math.ceil(words / 200)`)
- **Edited Label**: Shown when `Math.abs(updatedAt - createdAt) > 1000ms`
- **AI Summary Block**: Glassmorphic lavender card, italic text
- **Dynamic Page Title**: Angular `Title` service sets `"${blog.title} — Modern Source"` on every article

### Blog Editor (3-Step Wizard)
- **Step 1 — Details**: Title input, cover image drag-and-drop zone (5MB limit, `image/*` only), category chip input
- **Step 2 — Write**: Full-width content textarea with live word count and estimated reading time
- **Step 3 — Preview**: Renders the article exactly as it will appear in the detail view
- **Draft Auto-Save**: RxJS Subject + `debounceTime(1500)` → saves to `localStorage` with `userId`-scoped key; draft loaded on init, cleared on successful publish
- **Publish Confirmation**: `window.confirm()` before dispatching create/update action

### Home Feed
- **Category Pill Filter**: Animated sliding indicator, horizontally scrollable on mobile with hidden scrollbar; auto-hides when no categories exist
- **Skeleton Loaders**: 6 shimmer-gradient placeholder cards during initial fetch — match the real grid layout to prevent reflow
- **Card Hover**: `translateY(-4px)` lift + image `scale(1.05)` zoom
- **Load More Pagination**: Appends to existing list; "Load More" button hidden when `nextToken === null`
- **Empty State**: SVG illustration + contextual message and CTA per mode (public / my-blogs)
- **My Blogs View**: Filters home feed to current user's posts; dispatches `loadBlogs({ authorId })`

### Notification System
- Signal-based `NotificationService` — `success()`, `error()`, `show()`
- Animated snackbar: spring-up entrance animation, linear 5-second countdown progress bar, click-to-dismiss

---

## 8. Mobile Responsive Overhaul

- **Navbar**: Hamburger menu with slide-out drawer; backdrop overlay; animated hamburger → X transform
- **Admin Sidebar**: Drawer mode on mobile; persistent sidebar on desktop (≥ 768px)
- **Category Filter**: Horizontal scroll with hidden scrollbar on mobile
- **Admin Tables**: Converted to card layout on screens < 768px — `thead` hidden, pseudo-element `::before` labels injected per row
- **Blog Editor**: Toolbar collapses to compact layout; buttons use equal-width grid
- **Article Detail**: Edge-to-edge hero image; paragraph text left-aligned (not justified) on small screens
- **Touch Targets**: Interactive elements sized for 38–44px minimum height

---

## 9. Technical Bug Fixes & Refinements

- **DynamoDB Reserved Keywords**: `status` is a DynamoDB reserved word — resolved by implementing `#s` expression attribute name aliasing in all queries and updates
- **Amplify Change Detection**: `@aws-amplify/ui-angular` Authenticator state machine runs outside Angular's `NgZone`. Fixed the "Forgot Password" UI freeze by wrapping the Amplify Hub listener callbacks inside `ngZone.run()` to trigger Angular change detection
- **Category Data Integrity**: Category mapping items require a full copy of blog metadata — without it, AppSync returned null on `summary_ai` and other fields. Fixed by adding full denormalization in `BlogRepository.saveBlog()`
- **Cognito Group Parsing**: `cognito:groups` claim arrives as `List<String>`, plain comma-separated `String`, or JSON-array `String` depending on token version. `isAdminIdentity()` now handles all three formats
- **Deployment Optimization**: SAM template and `pom.xml` correctly configured for Maven JAR packaging with Spring Cloud Function `FunctionInvoker` as the Lambda handler entry point
- **Blog Detail Selector Fix**: `BlogDetail` now uses `getAllBlogsUnfiltered` (not `getAllBlogs`) — prevents a blog from "disappearing" from the detail view when a category filter is active on the home feed
- **Draft Privacy Fix**: `localStorage` draft keys now include `userId` — prevents User A's draft from appearing to User B on a shared browser

---

## 10. Deep Infrastructure & Security

- **Bedrock Cross-Region Routing**: Database in `ap-south-2` (Hyderabad); Bedrock AI calls routed to `us-east-1` where GPT-OSS 20B is available — two separate AWS client beans with different region configs
- **IAM Policy Hardening**: Lambda execution role explicitly grants `s3:DeleteObject`, `bedrock:InvokeModel`, `cognito-idp:ListUsers`, `cognito-idp:AdminAddUserToGroup`, `cognito-idp:AdminRemoveUserFromGroup` — all resource-scoped
- **S3 Object Security**: `S3Service` sanitizes filenames (UUID prefix, strips special characters, blocks `..`) and generates presigned URLs with 15-minute TTL — prevents path traversal and injection
- **SnapStart**: Enabled at the CloudFormation level — Lambda snapshots the initialized JVM, significantly reducing cold start penalty for a Spring Boot application

---

## 11. Git & Environment Safety

- **Git Security**: `.gitignore` excludes `target/`, `.aws-sam/`, `environment.ts` (real AWS config), `.env`, and all local IDE files — no secrets or build artifacts committed
- **Environment Template**: `environment.example.ts` provides a safe template for new contributors to copy and fill in their own AWS resource IDs
- **SAM Config**: `samconfig.toml` stores deployment config (`stack_name`, `region`) without any secrets
