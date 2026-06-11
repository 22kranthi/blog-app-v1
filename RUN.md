# How to Run — Modern Source Blog Platform

This guide covers two paths:

- **Path A — Frontend only** (5 min, no AWS work). Runs the dev server against the already-deployed AWS stack. Reading blogs works immediately. Creating/editing/deleting requires the backend to be deployed.
- **Path B — Full deploy** (~15 min first time). Builds the Java backend and deploys everything to AWS.

---

## 0. Prerequisites

| Tool | Required for | Verify |
|---|---|---|
| Java 17+ | Building the backend | `java -version` |
| Node 20+ | Running the frontend | `node -v` |
| npm 10+ | Frontend dependencies | `npm -v` |
| Maven 3.8+ | Building the backend JAR | `mvn -v` |
| AWS CLI v2 | AWS authentication | `aws --version` |
| AWS SAM CLI | Deploying the backend | `sam --version` |

### Install missing tools (PowerShell, run as Administrator)

```powershell
winget install --id Apache.Maven   -e
winget install --id Amazon.AWSCLI  -e
winget install --id Amazon.SAM-CLI -e
```

Restart your terminal after installing, then verify:

```powershell
mvn -v; aws --version; sam --version
```

---

## Path A — Run the frontend only

```powershell
cd C:\Users\sabav\OneDrive\Desktop\blog-app-v1\frontend
npm install
npm start
```

Open **http://localhost:4200/**

**What works:**
- Full UI renders — home feed, article detail, category filter, skeleton loaders
- Cognito login, sign-up, forgot password
- Reading all published blogs (hits the live AppSync API)
- Admin dashboard (if your account is in the `ADMIN` group)

**What requires the backend (Path B):**
- Creating, editing, or deleting blog posts (these call Lambda)
- Image upload (calls Lambda to generate a presigned S3 URL)

---

## Path B — Full deploy

### B.1 Configure AWS credentials (one-time)

```powershell
aws configure
# AWS Access Key ID:     <your key>
# AWS Secret Access Key: <your secret>
# Default region name:   ap-south-2
# Default output format: json
```

`samconfig.toml` is pinned to `ap-south-2` — keep the region consistent.

### B.2 Enable Bedrock model access (one-time)

The Lambda uses **OpenAI GPT-OSS 20B** (`openai.gpt-oss-20b-1:0`) in `us-east-1`. You must enable it once:

1. Open the **AWS Console** → switch region to **US East (N. Virginia) — us-east-1**
2. Go to **Amazon Bedrock → Model access → Manage model access**
3. Find and enable **`openai.gpt-oss-20b-1:0`** (OpenAI GPT-OSS 20B)
4. Wait for the status to show **Access granted** (usually instant, sometimes a few minutes)

> ⚠️ If you skip this step, blog creation will still succeed but `summary_ai` will return `"AI summary not available at this time."` and a `AccessDeniedException` will appear in CloudWatch logs.

### B.3 Build the backend JAR

```powershell
cd C:\Users\sabav\OneDrive\Desktop\blog-app-v1\backend
mvn clean package
```

This produces `target/serverless-backend-1.0.0-SNAPSHOT.jar`. The JAR's `META-INF/MANIFEST.MF` should contain:

```
Main-Class: org.springframework.cloud.function.adapter.aws.FunctionInvoker
Start-Class: com.blog.backend.ServerlessBackendApplication
```

If `Start-Class` is missing, the `spring-boot-maven-plugin` repackage goal didn't run — see *Troubleshooting* below.

### B.4 Deploy the backend

```powershell
cd C:\Users\sabav\OneDrive\Desktop\blog-app-v1\backend
sam build
sam deploy
```

- **First deploy**: provisions all AWS resources from scratch — DynamoDB table, S3 bucket, Cognito User Pool, AppSync API, Lambda function, IAM roles, all resolvers (~5–8 min)
- **Subsequent deploys**: updates only changed resources (~1–2 min)

### B.5 Read the CloudFormation outputs

```powershell
aws cloudformation describe-stacks `
  --stack-name blog-app `
  --query "Stacks[0].Outputs" `
  --output table
```

You'll see these values:

| Output Key | Used for |
|---|---|
| `AppSyncApiUrl` | AppSync GraphQL endpoint |
| `AppSyncApiKey` | Guest API key for unauthenticated reads |
| `UserPoolId` | Cognito User Pool ID |
| `UserPoolClientId` | Cognito App Client ID |
| `S3BucketName` | Image upload bucket name |

### B.6 Configure the frontend environment

Copy the template and fill in the values from step B.5:

```powershell
cd C:\Users\sabav\OneDrive\Desktop\blog-app-v1\frontend
cp src\environments\environment.example.ts src\environments\environment.ts
```

Open `src/environments/environment.ts` and fill in:

```typescript
export const environment = {
  production: false,
  aws: {
    region: 'ap-south-2',
    userPoolId: '<UserPoolId from outputs>',
    userPoolWebClientId: '<UserPoolClientId from outputs>',
    appSyncGraphqlEndpoint: '<AppSyncApiUrl from outputs>',
    apiKey: '<AppSyncApiKey from outputs>',
    s3BucketName: '<S3BucketName from outputs>'
  }
};
```

> `environment.ts` is gitignored — your real AWS values are never committed.

### B.7 Run the frontend

```powershell
cd C:\Users\sabav\OneDrive\Desktop\blog-app-v1\frontend
npm install       # first time only
npm start
```

Open **http://localhost:4200/**

### B.8 Make yourself an admin

After signing up via the app, you need to add your account to the `ADMIN` Cognito group:

**Option 1 — AWS Console (one-time setup):**
1. AWS Console → Cognito → User Pools → `BlogPlatformUsers`
2. Create the `ADMIN` group if it doesn't exist
3. Find your user → add to `ADMIN` group
4. Sign out and sign back in in the app to refresh the JWT
5. The **Dashboard** link will now appear in the navbar

**Option 2 — Via the Admin Dashboard (if you already have one admin):**
1. Sign in as an existing admin
2. Navigate to `/admin/users`
3. Find the target user → click **Grant Admin**
4. The target user signs out and back in — they now have admin access

---

## Smoke Test

After a successful full deploy:

1. **Sign up** with a new account → verify email → sign in
2. Click **+ New Post**, fill in title, content, at least one category, upload a cover image
3. Click **Preview** (Step 3) — verify it renders like a real article
4. Submit → wait 3–8 seconds for the Bedrock AI summary to generate
5. The new card on `/` should show a 2-sentence purple summary block
6. Click **Read more** → verify the reading progress bar works, copy link works, back-to-top appears on long posts
7. As an admin: navigate to `/admin` → check stat cards → go to **Content** → search, sort, and export
8. As an admin: go to **Users** → verify your account appears, try granting/revoking admin on another user

**CloudWatch check** (no errors expected):
```powershell
aws logs tail /aws/lambda/blog-app-BlogBackendFunction-<suffix> --follow
```

---

## Troubleshooting

### `mvn package` succeeds but JAR is missing `Start-Class`

Inspect the manifest:

```powershell
cd C:\Users\sabav\OneDrive\Desktop\blog-app-v1\backend
jar xf target\serverless-backend-1.0.0-SNAPSHOT.jar META-INF/MANIFEST.MF
type META-INF\MANIFEST.MF
```

The `pom.xml` must have the `spring-boot-maven-plugin` with a `<goal>repackage</goal>` execution block. If it's missing, re-add it.

### Lambda logs `Runtime.BadFunctionCode` or `Handler not found`

Force a clean re-upload:

```powershell
sam build --use-container=false
sam deploy --force-upload
```

### Bedrock returns `AccessDeniedException`

- Model access not granted in `us-east-1` (step B.2)
- Or the Lambda IAM role is missing `bedrock:InvokeModel` for `openai.gpt-oss-20b-1:0` — check `template.yaml`

### Frontend gets `401 / Not authorized` on GraphQL calls

The values in `environment.ts` don't match the deployed stack. Re-run B.5 and copy in the fresh values.

### `/admin` shows nothing or redirects away

Your account is not in the Cognito `ADMIN` group, or the JWT is stale. Sign out and sign back in after being added to the group.

### `npm start` errors with "Cannot find module @angular/cli"

Use `npm start` (not `ng serve`) — the npm script invokes the locally installed Angular CLI from `node_modules`. Never requires a global `ng` install.

### `sam deploy` says "stack does not exist" when you expected an update

Check region consistency:

```powershell
aws configure get region
type samconfig.toml | findstr region
```

Both must be `ap-south-2`.

### Category filter shows no results after filtering

This is expected if the category mapping items don't exist for older posts. Any blog created or updated after the adjacency list refactor will have proper category mappings.
