# How to Run `blog-app-v1`

This guide covers two paths:

- **Path A — Frontend only** (5 min, no AWS work). Runs `ng serve` against the already-deployed AWS stack. UI renders; mutations will fail until the backend is redeployed (Path B).
- **Path B — Full deploy** (~15 min the first time). Builds the fixed Java jar and deploys backend + frontend.

---

## 0. Prerequisites

| Tool | Required for | Check |
|------|--------------|-------|
| Java 17+ | building backend | `java -version` |
| Node 20+ | running frontend | `node -v` |
| npm 10+ | frontend deps | `npm -v` |
| Maven 3.8+ | building backend jar | `mvn -v` |
| AWS CLI v2 | AWS auth | `aws --version` |
| AWS SAM CLI | deploying backend | `sam --version` |

You already have Java + Node + npm. You need **Maven, AWS CLI, SAM CLI** for Path B.

### Install the missing tools (PowerShell, run as Administrator)

```powershell
winget install --id Apache.Maven       -e
winget install --id Amazon.AWSCLI      -e
winget install --id Amazon.SAM-CLI     -e
```

Close and reopen your terminal so `PATH` refreshes, then verify:

```powershell
mvn -v ; aws --version ; sam --version
```

---

## Path A — Run the frontend only (no AWS work)

```powershell
cd C:\Users\Hemanth\Desktop\Kranthi\blog-app-v1\frontend
npm install
npm start
```

Open http://localhost:4200/.

What works:
- UI renders.
- Cognito login works (the user pool is live).
- Reading the blog list works (hits the AppSync GraphQL API, which is also live).

What does **not** work yet:
- `createBlog`, `updateBlog`, `deleteBlog`, `getUploadUrl` — they all hit the Lambda, which is still in the pre-Phase-0 broken state in AWS until you do Path B.

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

`samconfig.toml` is pinned to `ap-south-2`; keep that consistent.

### B.2 Enable Bedrock model access (one-time)

The Lambda calls **Claude 3.5 Sonnet** in `us-east-1` (default of the new `BEDROCK_REGION` env var). In the AWS console:

1. Switch region to **US East (N. Virginia) — us-east-1**.
2. Bedrock → Model access → Manage model access.
3. Enable `anthropic.claude-3-5-sonnet-20240620-v1:0`.
4. Wait for the status to show "Access granted" (usually instant, sometimes a few minutes).

### B.3 Build the backend jar

```powershell
cd C:\Users\Hemanth\Desktop\Kranthi\blog-app-v1\backend
mvn clean package
```

This produces `target/serverless-backend-1.0.0-SNAPSHOT.jar`. With the Phase 0 fix to `pom.xml`, the jar's `META-INF/MANIFEST.MF` will now contain:

```
Main-Class: org.springframework.cloud.function.adapter.aws.FunctionInvoker
Start-Class: com.blog.backend.ServerlessBackendApplication
```

If `Start-Class:` is missing, the repackage didn't run — see *Troubleshooting* below.

### B.4 Deploy the stack

```powershell
sam deploy --no-confirm-changeset
```

First deploy provisions everything from scratch (~5–8 min). Subsequent deploys update in place (~1–2 min).

### B.5 Read the stack outputs

```powershell
aws cloudformation describe-stacks `
  --stack-name blog-app `
  --query "Stacks[0].Outputs" `
  --output table
```

You'll see four values:

- `AppSyncApiUrl`
- `UserPoolId`
- `UserPoolClientId`
- `S3BucketName`

If any of these differ from the values currently in `frontend/src/environments/environment.ts`, paste the new ones in:

```typescript
// frontend/src/environments/environment.ts
export const environment = {
  production: false,
  aws: {
    region: 'ap-south-2',
    userPoolId: '<UserPoolId from outputs>',
    userPoolWebClientId: '<UserPoolClientId from outputs>',
    appSyncGraphqlEndpoint: '<AppSyncApiUrl from outputs>',
    s3BucketName: '<S3BucketName from outputs>'
  }
};
```

### B.6 Run the frontend

```powershell
cd C:\Users\Hemanth\Desktop\Kranthi\blog-app-v1\frontend
npm install     # first time only
npm start
```

Open http://localhost:4200/.

### B.7 Make yourself an admin (one-time)

The `ADMIN` Cognito group is not auto-assigned (Phase 1.7 todo). After signing up:

1. AWS console → Cognito → User pools → `BlogPlatformUsers`.
2. Create the `ADMIN` group if it doesn't exist.
3. Add your user to it.
4. Sign out + sign in again in the app to refresh the JWT, then `/admin` will be visible.

---

## Quick smoke test

After Path B:

1. Sign up + sign in.
2. Click "Add blog", fill in title/content/category, submit.
3. Wait 2–4 s for the Bedrock summary to generate.
4. The new card on `/` should show the AI summary in purple.
5. CloudWatch (`/aws/lambda/blog-app-BlogBackendFunction-...`) should show no `Runtime.BadFunctionCode` errors.

---

## Troubleshooting

### `mvn package` succeeds but jar is missing `Start-Class`

Inspect the manifest:

```powershell
cd C:\Users\Hemanth\Desktop\Kranthi\blog-app-v1\backend
& "C:\Program Files\Common Files\Oracle\Java\javapath\jar.exe" `
    xf target\serverless-backend-1.0.0-SNAPSHOT.jar META-INF/MANIFEST.MF
type META-INF\MANIFEST.MF
```

The `<execution><goal>repackage</goal></execution>` block in `pom.xml` lines ~99–116 must be present. If it isn't, that change was lost — re-apply it.

### Lambda still logs `Runtime.BadFunctionCode`

`sam deploy` may not have re-uploaded the jar if it thinks nothing changed. Force it:

```powershell
sam build --use-container=false
sam deploy --no-confirm-changeset --force-upload
```

### Bedrock returns `AccessDeniedException`

Either:

- Model access not granted in `us-east-1` (B.2 step), or
- The Lambda's IAM role doesn't have `bedrock:InvokeModel` for that model. (`template.yaml` grants `*`; that should cover it.)

### Frontend gets `401` / `Not authorized` on every GraphQL call

The IDs in `environment.ts` don't match the deployed stack. Re-run B.5 and copy them in.

### `npm start` errors with "Cannot find module @angular/cli"

You have `npm install`-installed local Angular CLI but no global `ng`. Use `npm start` instead of `ng serve` (the npm script invokes the local copy). All commands in this doc use `npm start`.

### `sam deploy` says "stack does not exist" but you expected it to update

Check the region:

```powershell
aws configure get region
type samconfig.toml | findstr region
```

Both should be `ap-south-2`.

---

## What's left to do (Phase 1, not yet built)

Even after a successful deploy, these are still incomplete:

- **Image upload UI** — `BlogForm` has no `<input type="file">`. The backend `getUploadUrl` resolver works; the frontend never calls it.
- **Inverted permission check** at `blog-form.ts:78` — non-admin authors can hit a wrongly-rejecting branch when editing their own post.
- **Route guards** — `/admin` flickers visible to non-admins before the component-level redirect.
- **Auto-add to USERS group on signup** — no Cognito post-confirmation Lambda; you must manually add users to groups.
- **Rekognition image moderation** — not wired up despite being in the spec.
- **CI/CD** — no `.github/workflows/deploy.yml`; deploys are manual.

See `FIX_PLAN.md` (Phase 1) for the full list and proposed fixes.
