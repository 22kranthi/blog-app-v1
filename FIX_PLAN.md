# `blog-app-v1` — Fix Plan

> Audit performed by 3 parallel `Explore` agents (backend, frontend, infrastructure) on 2026-04-25.
> Total findings: **~60** (9 P0 broken, ~14 P1 incomplete, ~25 P2 improvements, ~12 P3 nice-to-have).

---

## Phase 0 — P0 Broken: get the app working

These are blocking. The Lambda is currently dead and ~75 % of the GraphQL surface returns errors.

### 0.1 — Fix Lambda cold-start (`Runtime.BadFunctionCode`)
**Symptom (`blogAppLambda-logs.txt`):** "Failed to discover main class" / `Runtime.BadFunctionCode`.
**Cause:** `pom.xml` (`spring-boot-maven-plugin`, lines ~99-101) is declared without an explicit `<execution>` for the `repackage` goal *and* without `<configuration><mainClass>`. Result: the artifact uploaded to Lambda is the un-shaded `.jar.original` (Spring Cloud Function can't find `Start-Class` in its `META-INF/MANIFEST.MF`).
**Fix:**
1. In `backend/pom.xml`, replace the `spring-boot-maven-plugin` block with:
   ```xml
   <plugin>
     <groupId>org.springframework.boot</groupId>
     <artifactId>spring-boot-maven-plugin</artifactId>
     <configuration>
       <mainClass>com.blog.backend.ServerlessBackendApplication</mainClass>
     </configuration>
     <executions>
       <execution>
         <goals><goal>repackage</goal></goals>
       </execution>
     </executions>
   </plugin>
   ```
2. In `backend/template.yaml` (Lambda resource), add an explicit `Environment.Variables.MAIN_CLASS: com.blog.backend.ServerlessBackendApplication` as a defense-in-depth.
3. `sam build && sam deploy` and re-check CloudWatch.

### 0.2 — Add the 6 missing AppSync resolvers
`backend/template.yaml` lines 229-243 only define resolvers for `Mutation.createBlog` and `Query.listBlogs`. The schema declares 4 queries + 4 mutations → 6 fields are silently broken.
**Fix:** Add `AWS::AppSync::Resolver` resources for `Query.getBlog`, `Query.listBlogsByCategory`, `Mutation.updateBlog`, `Mutation.deleteBlog`, `Mutation.getUploadUrl`. All point to the same Lambda data source.

### 0.3 — Implement the 2 missing Java handlers
`BlogFunctionConfig.java:45-51` doesn't switch on `getBlog` or `listBlogsByCategory`. Add cases:
- `getBlog` → call existing `BlogRepository.getBlog(id)` (already exists).
- `listBlogsByCategory` → **new** `BlogRepository.listBlogsByCategory(category)` using a DynamoDB `Query` on `CategoryIndex` GSI. (The GSI is provisioned but never used — wasted infra today.)

### 0.4 — Auth-gate `getUploadUrl`
`BlogFunctionConfig.java:149-153` issues a presigned PUT URL with **no auth check**. Any anonymous caller (or any user with another user's filename) can overwrite images.
**Fix:**
- Require `event.getIdentity()` non-null.
- Sanitize the filename (regex `^[a-zA-Z0-9._-]+$`) and reject path traversal.
- Build the S3 key as `uploads/{userId}/{uuid}-{filename}` so users can't write outside their prefix.

### 0.5 — Fix Bedrock region mismatch
`AwsConfig.java:24` pins Bedrock to `us-east-1`; deployment is `ap-south-2`. Cross-region is slow, costly, and Claude 3.5 Sonnet may not even exist in `ap-south-2` yet.
**Fix:** Read region from env var `BEDROCK_REGION` (default `us-east-1` since Bedrock has limited APAC availability), and set it explicitly in `template.yaml`. Verify model availability before changing region.

### 0.6 — Remove committed build artifacts and secrets
- `backend/target/**` and `backend/.aws-sam/build.toml` are tracked in git. Add `backend/.gitignore` with `target/`, `.aws-sam/`, `*.class`, `.classpath`, `.settings/`.
- `frontend/src/environments/environment.ts` lines 4-8 contain real Cognito User Pool ID, Web Client ID, and AppSync URL. Not strictly secrets, but should be CloudFormation `Outputs` consumed at build-time, not committed. Move to `environment.prod.ts` populated by CI from stack outputs.

### 0.7 — Frontend SSR hydration
`src/app/app.config.ts` imports `provideClientHydration` but never adds it to providers. SSR + CSR render mismatch. **Fix:** add `provideClientHydration()` to the providers array.

### 0.8 — Subscription leaks in `blog-detail.ts`
`src/app/blog-detail/blog-detail.ts:23-36` nests `route.paramMap.subscribe` → `store.select(...).subscribe`, neither cleaned up. **Fix:** use `takeUntilDestroyed(this.destroyRef)` or convert to `toSignal()` (Angular 21).

### 0.9 — Double-subscription in `blog-list.html`
`src/app/blog-list/blog-list.html:6-7` uses `(blogList | async)?.length` and `*ngFor="let blog of blogList | async"` — two independent subscriptions, two Apollo/AppSync calls.
**Fix:** assign once: `@if (blogList | async; as blogs) { @for (blog of blogs; track blog.id) {...} }`.

---

## Phase 1 — P1 Incomplete: features that exist on paper but don't work end-to-end

### 1.1 — Image upload UX
`BlogService.getUploadUrl()` exists but is never called anywhere. `BlogForm` has no file input. **Fix:** add `<input type="file">`, call `getUploadUrl()` on file select, `PUT` the file with the returned URL, then put the public S3 URL on the blog's `imageUrl` field on submit.

### 1.2 — Route guards
`/admin`, `/add`, `/edit/:id` are gated only inside the components → a flicker of the protected UI is visible.
**Fix:** create `authGuard` and `adminGuard` (`canActivateFn`), apply via `app.routes.ts`.

### 1.3 — Inverted permission in `blog-form.ts:78`
The condition `&& (!this.authService.currentUserId())` always rejects logged-in users. **Fix:**
```ts
if (!this.authService.isAdmin() && this.authService.currentUserId() !== blog.authorId) { ... }
```

### 1.4 — Type-safe GraphQL
`blog.service.ts` uses `any` everywhere, no `catchError`. **Fix:** introduce `BlogResponse` / `BlogsListResponse` interfaces (or `graphql-codegen`), wrap calls in `from(...).pipe(catchError(...))`.

### 1.5 — Direct-link routing for `/blog/:id`
`BlogDetail` reads from store; if a user lands directly, store is empty → it redirects home. **Fix:** dispatch `loadBlogs()` (or a new `loadBlog(id)`) on init.

### 1.6 — Cognito groups claim parsing
`BlogFunctionConfig.java:59-62` only handles the `List<String>` shape. Some Cognito setups serialise `cognito:groups` as JSON string. **Fix:** branch on type, parse string fallback.

### 1.7 — Spec features not implemented
- **Rekognition image moderation:** add `software.amazon.awssdk:rekognition` to `pom.xml`, `ImageModerationService`, an S3 `ObjectCreated:*` event source on the bucket pointing at the Lambda (or a new dedicated Lambda).
- **Cognito post-confirmation trigger:** new tiny Lambda that adds new users to the `USERS` group; wire to `LambdaConfig.PostConfirmation` on the User Pool.

### 1.8 — Lambda observability
In `template.yaml`'s Lambda: add `Tracing: Active`, `DeadLetterConfig`, `Tags`. Without these, production debugging is blind.

### 1.9 — NgRx update/delete patches
Effects currently re-dispatch `loadBlogs()` after every mutation → full Scan re-fetch on each edit. **Fix:** add `updateBlogSuccess`, `deleteBlogSuccess` actions; reducer mutates the array locally.

### 1.10 — Build artifacts in git (already in 0.6)
Listed here too because once `.gitignore` is added, `git rm -r --cached backend/target backend/.aws-sam` is needed.

### 1.11 — CI/CD
No `.github/workflows/`. Deploy is manual. **Fix:** add `deploy.yml` (matrix Java 17 + Node 20: `mvn package` → `sam deploy --no-confirm-changeset` for backend, `ng build` → S3 sync for frontend).

---

## Phase 2 — P2 Hardening / quality

### Security
- Scope `bedrock:InvokeModel` IAM (`template.yaml:181`) to the specific model ARN.
- Restrict S3 CORS `AllowedOrigins` to the frontend domain; remove `DELETE`/`POST` (presigned PUT is enough).
- Add `PublicAccessBlockConfiguration` (block all 4) and `BucketEncryption: AES256` to the S3 bucket.
- Add `PointInTimeRecoverySpecification` + `SSESpecification` to the DynamoDB table.
- Cognito: enable `MfaConfiguration: OPTIONAL` for prod; consider removing `AutoVerifiedAttributes: [email]` in favour of true verification.

### Backend code quality
- Replace `System.out.println` with SLF4J everywhere. Exclude transitive `commons-logging` in `pom.xml` (the init log warns about it).
- Wrap Bedrock content in a system/user message split to mitigate prompt-injection via blog body (`BedrockService.java:30`).
- Move Bedrock model id to `BEDROCK_MODEL_ID` env var.
- Replace the `listBlogs` Scan with paginated Query + `ExclusiveStartKey`.
- Add input validation on `createBlog`/`updateBlog` (title ≤ 256, content ≤ 1 MB, category whitelist, contentType whitelist for `getUploadUrl`).
- Add null guards on `event.getInfo()` / `event.getArguments()` / `event.getIdentity()`.
- Fix `BlogRepository.updateBlog` — currently does Scan + Put; should be `UpdateItem`.
- Add `updatedAt` timestamp to `Blog`.
- Introduce a DTO layer separate from the entity.
- Drop the dead `SPRING_CLOUD_FUNCTION_DEFINITION` env var (`template.yaml:195`) — the router bean is named `handleRequest`.

### Frontend code quality
- `ChangeDetectionStrategy.OnPush` + `@for (... ; track blog.id)` (Angular 21 control-flow).
- Global `ErrorHandler` provider for AppSync errors.
- Token-refresh listener so a user added to `ADMIN` mid-session sees admin UI without re-login.
- Add `error` actions/state in NgRx, plus loading / empty / error templates per page.
- Fix `app.spec.ts` — it asserts a string the template no longer renders.
- Add the missing `status?: 'draft' | 'published' | 'archived'` to `Blog` model.
- Replace `alert()` (`blog-form.ts:71`) with a snackbar.
- Real `NotFoundComponent` for the wildcard route instead of redirecting to `/`.
- Guard image-upload code with `isPlatformBrowser()` (SSR will otherwise blow up).

---

## Phase 3 — P3 Nice-to-have

- Frontend hosting infra (S3 + CloudFront or Amplify Hosting) defined in `template.yaml` so the whole stack is one deploy.
- Category filter UI on the blog list (the GSI exists, the data is there).
- `EntityAdapter` for the NgRx blog store.
- DynamoDB GSI projection downgrade to `KEYS_ONLY` once the list view is paginated.
- Constants module for magic strings (`"BLOG#"`, `"METADATA"`, `"ADMIN"`, `"PUBLISHED"`).
- Form-validation messages, image preview, drag-drop in `blog-form`.

---

## Suggested execution order (highest value first)

1. **0.6** (`.gitignore` + remove tracked build artifacts) — 5 min, prevents future grief.
2. **0.1** (Lambda packaging) — unblocks every backend feature.
3. **0.5** (Bedrock region) — same deploy as 0.1.
4. **0.2 + 0.3** (resolvers + handlers) — restores 6 broken GraphQL fields.
5. **0.4** (auth-gate `getUploadUrl`) — closes the obvious abuse path.
6. **0.7 + 0.8 + 0.9** (small frontend correctness wins) — one small PR.
7. **1.3** (inverted permission) and **1.5** (direct-link blog detail) — UX bugs.
8. **1.2** (route guards) and **1.4** (typed GraphQL).
9. **1.1** (image upload UX) — biggest user-visible feature gap.
10. **1.7** (Rekognition + post-confirmation) — finishes the spec.
11. Phase 2 hardening as time allows.

---

## Verification steps after each phase

- **Backend:** `mvn -f backend/pom.xml package`, then inspect `target/serverless-backend-1.0.0-SNAPSHOT.jar` → `META-INF/MANIFEST.MF` should contain `Start-Class: com.blog.backend.ServerlessBackendApplication`. `sam local invoke BlogLambda -e events/listBlogs.json` for a smoke test before deploy.
- **GraphQL:** in the AppSync console's Queries tab, run each of the 4 queries and 4 mutations against a Cognito-authenticated user.
- **Frontend:** `ng serve`, log in, create a blog with an image, verify summary appears, hit `/admin` as a non-admin and confirm the guard redirects, hit `/blog/<known-id>` directly.
- **CloudWatch:** confirm the `Runtime.BadFunctionCode` error stops appearing after Phase 0.
