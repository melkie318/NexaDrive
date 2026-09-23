# NexaDrive — Backend

A cloud file storage and management platform built with **Node.js**, **Express**, **TypeScript**, **Prisma**, and **PostgreSQL**.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
  - [Phase 0 — Project Foundation](#phase-0--project-foundation)
  - [Phase 1 — Database + Prisma](#phase-1--database--prisma)
  - [Phase 2 — Express Backend Architecture](#phase-2--express-backend-architecture)
  - [Phase 3 — Authentication + Account Security](#phase-3--authentication--account-security)
  - [Phase 4 — User Management](#phase-4--user-management)
  - [Phase 5 — Folder Management](#phase-5--folder-management)
  - [Phase 6 — File Storage + File Operations](#phase-6--file-storage--file-operations)
  - [Phase 7 — Storage Quota + Storage Engine](#phase-7--storage-quota--storage-engine)
  - [Phase 8 — Authorization + Permission Engine](#phase-8--authorization--permission-engine)
  - [Phase 9 — Sharing + Groups + Invitations](#phase-9--sharing--groups--invitations)
  - [Phase 10 — Trash + Recovery](#phase-10--trash--recovery)
  - [Phase 11 — File Versioning](#phase-11--file-versioning)
  - [Phase 12 — ZIP Compression + Extraction](#phase-12--zip-compression--extraction)
- [Architecture](#architecture)
- [Roadmap](#roadmap)

---

## Project Overview

NexaDrive is a full-featured cloud drive backend. Users can register, upload files, organize them in nested folders, manage their storage quota, download with streaming support, copy, move, rename, and soft-delete files — all protected behind JWT authentication.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript 5.x |
| Framework | Express 5 |
| ORM | Prisma 6 |
| Database | PostgreSQL |
| Auth | JWT (access + refresh token rotation) |
| File uploads | Multer 2 |
| Validation | Zod 4 |
| Security | Helmet, CORS |
| Documentation | Swagger / OpenAPI 3 |
| Dev server | tsx watch |

---

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── db.ts
│   │   ├── env.ts              # All environment variables
│   │   └── swagger.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── file.controller.ts
│   │   ├── folder.controller.ts
│   │   ├── group.controller.ts
│   │   ├── invitation.controller.ts
│   │   ├── permission.controller.ts
│   │   ├── share.controller.ts
│   │   ├── storage.controller.ts
│   │   ├── trash.controller.ts
│   │   ├── user.controller.ts
│   │   ├── version.controller.ts
│   │   └── zip.controller.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts      # JWT authentication + role guard
│   │   ├── errorHandler.ts         # Global error handler + AppError
│   │   ├── notFound.ts
│   │   ├── permission.middleware.ts # requirePermission() route guard
│   │   └── upload.middleware.ts     # Multer configuration
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── file.routes.ts
│   │   ├── folder.routes.ts
│   │   ├── group.routes.ts
│   │   ├── health.routes.ts
│   │   ├── invitation.routes.ts
│   │   ├── permission.routes.ts
│   │   ├── share.routes.ts
│   │   ├── storage.routes.ts
│   │   ├── trash.routes.ts
│   │   ├── user.routes.ts
│   │   ├── version.routes.ts
│   │   └── zip.routes.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── file.service.ts
│   │   ├── folder.service.ts
│   │   ├── group.service.ts
│   │   ├── invitation.service.ts
│   │   ├── permission.service.ts   # Full permission engine
│   │   ├── share.service.ts
│   │   ├── trash.service.ts
│   │   ├── user.service.ts
│   │   ├── version.service.ts
│   │   ├── zip.service.ts
│   │   └── storage/
│   │       ├── storage.provider.ts   # StorageProvider interface
│   │       ├── local.provider.ts     # LocalStorageProvider (disk)
│   │       ├── storage.service.ts    # Active provider facade
│   │       └── quota.service.ts      # Quota check / increment / decrement
│   ├── types/
│   │   └── express.d.ts        # Extends Express Request with req.user
│   ├── utils/
│   │   ├── asyncHandler.ts
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   └── response.ts
│   ├── validations/
│   │   ├── auth.validation.ts
│   │   ├── file.validation.ts
│   │   ├── folder.validation.ts
│   │   ├── group.validation.ts
│   │   ├── invitation.validation.ts
│   │   ├── permission.validation.ts
│   │   ├── share.validation.ts
│   │   ├── trash.validation.ts
│   │   ├── user.validation.ts
│   │   ├── version.validation.ts
│   │   └── zip.validation.ts
│   ├── lib/
│   │   └── prisma.ts
│   ├── app.ts
│   └── server.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── uploads/                    # Local file storage (dev)
├── .env
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL running locally (or remote)
- npm

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd NexaDrive/server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# Run database migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Start the development server
npm run dev
```

The server starts on `http://localhost:5000` by default.  
Swagger docs are available at `http://localhost:5000/api-docs`.

---

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nexadrive

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Storage
STORAGE_UPLOAD_DIR=./uploads      # Local directory for uploaded files
MAX_FILE_SIZE_BYTES=5368709120    # 5 GB per file
TRASH_RETENTION_DAYS=30

# Client
CLIENT_URL=http://localhost:3000

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5000/api/v1/auth/github/callback

# Payments (Phase 18)
CHAPA_SECRET_KEY=
CHAPA_API_URL=https://api.chapa.co/v1
```

---

## API Overview

All endpoints are versioned under `/api/v1`.  
Protected endpoints require a `Bearer <accessToken>` header.

### Phase 0 — Project Foundation

Foundation setup — no application endpoints.

- Node.js + TypeScript project scaffold
- Express with Helmet, CORS, Morgan
- Environment configuration via dotenv
- Swagger / OpenAPI documentation at `/api-docs`
- Health check endpoint

```
GET /api/v1/health
```

---

### Phase 1 — Database + Prisma

PostgreSQL database connected via Prisma ORM.

**Database models:**

| Model | Purpose |
|---|---|
| `User` | Accounts, storage quota, roles |
| `RefreshToken` | Token rotation for session management |
| `OAuthAccount` | Google / GitHub OAuth links |
| `Folder` | Nested folder tree (self-referential) |
| `File` | File metadata (binary stored on disk) |
| `FileVersion` | Version history per file |
| `ResourcePermission` | Per-resource OWNER / EDITOR / VIEWER permissions |
| `Share` | Direct sharing between users or groups |
| `Invitation` | Invitation system with status tracking |
| `PublicLink` | Password-optional public share links |
| `Group` / `GroupMember` | Team groups for bulk sharing |
| `TrashItem` | Trash with original path for restore |
| `StoragePlan` / `Subscription` / `Payment` | Billing (future phases) |
| `Activity` | Audit log for all user actions |
| `Notification` | In-app notifications |

---

### Phase 2 — Express Backend Architecture

Reusable backend foundation.

**Established patterns:**

```
HTTP Request
    ↓
Route (Express Router)
    ↓
Controller (validates input, calls service)
    ↓
Service (business logic, Prisma calls)
    ↓
Prisma ORM
    ↓
PostgreSQL
```

**Shared utilities:**
- `asyncHandler` — wraps async controllers, forwards errors to Express
- `sendResponse` — consistent `{ success, message, data, meta }` envelope
- `AppError` — operational errors with HTTP status codes
- Global error handler catches everything and returns structured JSON

---

### Phase 3 — Authentication + Account Security

JWT-based authentication with refresh token rotation.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new account |
| `POST` | `/api/v1/auth/login` | Login with email + password |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh token and get new access token |
| `POST` | `/api/v1/auth/logout` | Revoke refresh token |
| `POST` | `/api/v1/auth/change-password` | Change password (requires current password) |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset token |
| `POST` | `/api/v1/auth/reset-password` | Reset password using token |
| `GET`  | `/api/v1/auth/google` | Redirect to Google OAuth consent |
| `GET`  | `/api/v1/auth/google/callback` | Google OAuth callback handler |
| `GET`  | `/api/v1/auth/github` | Redirect to GitHub OAuth consent |
| `GET`  | `/api/v1/auth/github/callback` | GitHub OAuth callback handler |

**Token flow:**

```
Login
  ↓
Verify password (bcrypt)
  ↓
Issue access token (15 min) + refresh token (7 days)
  ↓
Authenticated request via Bearer header
  ↓
Access token expires → POST /auth/refresh → new token pair
```

**Security:**
- Passwords hashed with bcrypt
- Access tokens: short-lived JWT (15 min)
- Refresh tokens: stored in DB, rotated on each use, revoked on logout
- OAuth accounts (Google, GitHub) linked per user — multiple providers per account supported

---

### Phase 4 — User Management

Self-service profile management and admin user operations.

**Self-service (`/api/v1/users/me/*`):**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/users/me` | Get own profile |
| `PATCH` | `/api/v1/users/me` | Update name, username, avatar |
| `PATCH` | `/api/v1/users/me/email` | Change email (requires password) |
| `GET` | `/api/v1/users/me/storage` | Storage quota, used, and available bytes |
| `GET` | `/api/v1/users/me/activity` | Paginated activity history |
| `GET` | `/api/v1/users/me/providers` | List linked OAuth providers |
| `DELETE` | `/api/v1/users/me/providers/:provider` | Unlink an OAuth provider |
| `POST` | `/api/v1/users/me/deactivate` | Deactivate own account |

**Admin only (`ADMIN` role required):**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/users` | List all users (paginated, searchable) |
| `GET` | `/api/v1/users/:id` | Get any user's profile |
| `PATCH` | `/api/v1/users/:id` | Update role, status, or storage quota |
| `DELETE` | `/api/v1/users/:id` | Hard-delete a user |

---

### Phase 5 — Folder Management

Nested folder tree (unlimited depth), owned per user.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/folders` | Create a folder (root or nested) |
| `GET` | `/api/v1/folders` | List folders at a level (paginated) |
| `GET` | `/api/v1/folders/:id` | Get folder with subfolders + breadcrumb |
| `PATCH` | `/api/v1/folders/:id` | Rename a folder |
| `PATCH` | `/api/v1/folders/:id/move` | Move a folder (or to root with `parentId: null`) |
| `DELETE` | `/api/v1/folders/:id` | Soft-delete (moves folder + subtree to trash) |

**Features:**
- Unlimited nesting depth (self-referential `parentId`)
- Breadcrumb path returned on `GET /:id`
- Circular move protection (cannot move into self or own descendants)
- Soft-delete moves the entire subtree — all nested folders and files are trashed together
- `TrashItem` records original path for future restore

**Example tree:**
```
My Drive
├── Documents
│   ├── University
│   │   ├── Projects
│   │   └── Reports
│   └── CV
├── Images
└── Videos
```

---

### Phase 6 — File Storage + File Operations

Local disk storage for development (S3-compatible later), with full CRUD and streaming downloads.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/files/upload` | Upload a file (`multipart/form-data`) |
| `GET` | `/api/v1/files` | List files at a level (paginated) |
| `GET` | `/api/v1/files/:id` | Get file metadata |
| `GET` | `/api/v1/files/:id/download` | Stream download (Range requests supported) |
| `PATCH` | `/api/v1/files/:id` | Rename a file |
| `PATCH` | `/api/v1/files/:id/move` | Move to folder or root (`folderId: null`) |
| `POST` | `/api/v1/files/:id/copy` | Copy file + metadata (quota-checked) |
| `DELETE` | `/api/v1/files/:id` | Soft-delete (moves to trash) |

#### Upload

Send a `multipart/form-data` request with:
- **`file`** — the binary (required)
- **`folderId`** — UUID of the destination folder (optional, omit for root)

```bash
curl -X POST http://localhost:5000/api/v1/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/report.pdf" \
  -F "folderId=3fa85f64-5717-4562-b3fc-2c963f66afa6"
```

#### Download

Full file streaming with HTTP Range support for resumable downloads and media seeking:

```bash
# Full download
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/v1/files/:id/download --output report.pdf

# Partial / Range download
curl -H "Authorization: Bearer <token>" \
  -H "Range: bytes=0-1023" \
  http://localhost:5000/api/v1/files/:id/download
```

#### Storage Architecture

```
PostgreSQL
  └── File metadata (name, size, mimeType, storagePath, folderId, ownerId, ...)

Local Disk  (uploads/<userId>/<timestamp>-<random>-<originalName>)
  └── Actual file binary (PDF, image, video, etc.)
```

The file binary is **never stored in PostgreSQL**. Only metadata and a storage key are saved.

#### Upload Flow

```
POST /files/upload
  ↓
Multer writes to OS temp dir
  ↓
Check file size against MAX_FILE_SIZE_BYTES
  ↓
Check user's remaining storage quota
  ↓
Validate destination folder ownership
  ↓
Move temp file → uploads/<userId>/...
  ↓
Prisma transaction:
  - Create File record
  - Create FileVersion (v1)
  - Increment user.usedStorage
  ↓
Log UPLOAD activity
  ↓
Return file metadata
```

#### Security

- **MIME type validation** — only whitelisted MIME prefixes accepted (images, video, audio, PDFs, Office docs, archives, etc.)
- **File size limit** — enforced by Multer at `MAX_FILE_SIZE_BYTES` (default 5 GB)
- **Storage quota** — checked before file is persisted; temp file cleaned up on rejection
- **Path traversal protection** — download endpoint verifies the resolved file path is within the `uploads/` directory before streaming
- **Safe filenames** — storage keys strip special characters and use `<timestamp>-<randomHex>-<name>` format to prevent collisions
- **Soft delete** — files go to trash, not permanently removed, preserving original folder path for restore

#### File Versioning (stored, exposed in Phase 11)

Every upload creates a `FileVersion` record (`versionNum: 1`). The copy and future re-upload operations will add new versions. The full versioning API (list, restore, delete versions) is implemented in Phase 11.

---

### Phase 7 — Storage Quota + Storage Engine

Introduced a clean provider abstraction and a centralised quota service. All file I/O now goes through `StorageService` instead of raw `fs` calls, making a future migration to S3-compatible object storage a single-line change.

#### Storage Engine Architecture

```
FileService / CopyService
    ↓
StorageService  (facade — active provider swap happens here)
    │
    ├── LocalStorageProvider   ← current (development)
    │     └── uploads/<userId>/<timestamp>-<hex>-<name>
    │
    └── S3StorageProvider      ← future (production / Phase 20)
          └── s3://<bucket>/<userId>/...
```

**`StorageProvider` interface** — every backend must implement:

| Method | Description |
|---|---|
| `save(tempPath, userId, name)` | Move temp file to permanent storage, return storage key |
| `delete(storageKey)` | Remove file (idempotent) |
| `copy(sourceKey, userId, name)` | Duplicate file to a new key, return new key |
| `resolve(storageKey)` | Return absolute path (local) or presigned URL (S3) |
| `exists(storageKey)` | Check file is accessible |
| `size(storageKey)` | Return byte size |

**`LocalStorageProvider`** adds path-traversal guards on every operation — the resolved path is always verified to sit inside the configured `uploads/` root before any I/O is performed.

#### Quota Engine

`QuotaService` is the single source of truth for all quota logic.

```
Upload request
    ↓
QuotaService.check(userId, fileSize)
    ↓
Enough space?
    ↙ YES                    ↘ NO
StorageService.save(...)    Reject 413 + cleanup temp file
    ↓
Prisma transaction:
  - Create File record
  - Create FileVersion
  - QuotaService.increment(userId, fileSize, tx)   ← inside same tx
```

| Method | Description |
|---|---|
| `check(userId, bytes)` | Returns `{ allowed, quota, used, available, usagePercent }` |
| `getStats(userId)` | Full quota breakdown including counts and warning flags |
| `increment(userId, bytes, tx?)` | Add bytes to `usedStorage` (accepts Prisma tx) |
| `decrement(userId, bytes, tx?)` | Subtract bytes, clamped at zero (for permanent deletes) |

#### Endpoint

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/storage/quota` | Full quota stats for the authenticated user |

**Response example:**

```json
{
  "success": true,
  "message": "Storage quota retrieved",
  "data": {
    "storageQuota":     "549755813888",
    "usedStorage":      "10485760",
    "availableStorage": "539270053888",
    "usagePercent":     1.91,
    "isNearFull":       false,
    "isFull":           false,
    "fileCount":        42,
    "folderCount":      8,
    "trashedFileCount": 3,
    "trashedFolderCount": 1
  }
}
```

**`isNearFull`** is `true` when usage reaches 90 % — the frontend can use this to show a storage warning banner. **`isFull`** is `true` when `availableStorage` reaches zero — all uploads will be rejected with 413 until space is freed.

---

### Phase 8 — Authorization + Permission Engine

A full resource-level permission system. Every file and folder operation is now gated by an explicit permission check — owners always pass automatically, and access granted to other users (or groups) is precisely controlled.

#### Permission Roles

| Role | Allowed Operations |
|---|---|
| `OWNER` | All 13 operations |
| `MANAGER` | All except `canManagePermissions` |
| `EDITOR` | view, download, upload, edit, rename, move, copy, delete, compress, extract |
| `CONTRIBUTOR` | view, download, upload, copy |
| `VIEWER` | view, download |
| `CUSTOM` | Exactly the operations listed in `customOps[]` |

#### All 13 Operations

`canView` · `canDownload` · `canUpload` · `canEdit` · `canRename` · `canMove` · `canCopy` · `canDelete` · `canRestore` · `canCompress` · `canExtract` · `canShare` · `canManagePermissions`

#### Resolution Flow

```
Request arrives
  ↓
authenticateUser   — verify JWT, attach req.user
  ↓
requirePermission  — calls PermissionService.can(userId, resourceType, resourceId, operation)
  ↓
  ┌─ 1. Is user the resource OWNER?           → ✅ all ops granted
  ├─ 2. Direct ResourcePermission for userId? → resolve ops from role/customOps
  ├─ 3. Group ResourcePermission (any group   → resolve ops, union with above
  │      the user is a member of)?
  └─ 4. Ancestor folder inheritance?          → walk parent chain, union ops
  ↓
Union of all sources (most-permissive wins)
  ↓
  allowed? → next()   |   denied? → 403
```

#### Permission Inheritance

Permissions granted on a **parent folder** automatically propagate down to all descendant folders and files. This means granting a user `VIEWER` on `/Documents` gives them `canView` + `canDownload` on every file and subfolder inside it — without needing individual entries.

```
Documents  ← user granted EDITOR here
  ├── University        ← inherits EDITOR
  │   ├── Projects      ← inherits EDITOR
  │   └── report.pdf   ← inherits EDITOR
  └── CV.pdf           ← inherits EDITOR
```

#### Permission Management API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/permissions/:resourceType/:resourceId` | Grant permission to a user or group |
| `GET` | `/api/v1/permissions/:resourceType/:resourceId` | List all permissions on a resource |
| `GET` | `/api/v1/permissions/:resourceType/:resourceId/me` | Get my effective permission map |
| `PATCH` | `/api/v1/permissions/:resourceType/:resourceId/:permissionId` | Update role or customOps |
| `DELETE` | `/api/v1/permissions/:resourceType/:resourceId/:permissionId` | Revoke a permission |

`:resourceType` is `file` or `folder`. All management endpoints require `canManagePermissions` on the resource.

**Grant example:**

```json
POST /api/v1/permissions/folder/3fa85f64-...
{
  "userId": "9b1deb4d-...",
  "role": "EDITOR"
}
```

**Custom role example:**

```json
POST /api/v1/permissions/file/9b1deb4d-...
{
  "groupId": "c1a2b3d4-...",
  "role": "CUSTOM",
  "customOps": ["canView", "canDownload", "canCopy"]
}
```

**Effective permissions response** (`GET /me`):

```json
{
  "canView": true,
  "canDownload": true,
  "canUpload": false,
  "canEdit": false,
  "canRename": false,
  "canMove": false,
  "canCopy": true,
  "canDelete": false,
  "canRestore": false,
  "canCompress": false,
  "canExtract": false,
  "canShare": false,
  "canManagePermissions": false
}
```

#### Guards Applied to Existing Routes

| Route | Required Operation |
|---|---|
| `GET /api/v1/folders/:id` | `canView` |
| `PATCH /api/v1/folders/:id` | `canRename` |
| `PATCH /api/v1/folders/:id/move` | `canMove` |
| `DELETE /api/v1/folders/:id` | `canDelete` |
| `GET /api/v1/files/:id` | `canView` |
| `GET /api/v1/files/:id/download` | `canDownload` |
| `PATCH /api/v1/files/:id` | `canRename` |
| `PATCH /api/v1/files/:id/move` | `canMove` |
| `POST /api/v1/files/:id/copy` | `canCopy` |
| `DELETE /api/v1/files/:id` | `canDelete` |

`POST /files/upload` — `canUpload` on the destination folder is checked inside `FileService` after multer processes the body (since `folderId` is a form field).

#### `requirePermission` Middleware

Declarative, one-liner route protection:

```typescript
router.get(
  '/:id',
  requirePermission('folder', (req) => req.params.id, 'canView'),
  FolderController.getFolderById,
);
```

The middleware calls `PermissionService.can()`, which resolves ownership first — so **owners always pass without any database permission row needed**.

---

### Phase 9 — Sharing + Groups + Invitations

Full collaboration support enabling users to share files and folders with individuals, groups, or via email invitations. Built on top of Phase 8's permission engine.

#### Group Management

Create groups to organize users for bulk permission grants. Groups have two roles: `ADMIN` (can manage members and group settings) and `MEMBER` (standard group member).

**Group API:**

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/groups` | Create a new group (creator becomes ADMIN) |
| `GET` | `/api/v1/groups` | List all groups I'm a member of |
| `GET` | `/api/v1/groups/:groupId` | Get group details with member list |
| `PATCH` | `/api/v1/groups/:groupId` | Update group name/description (admin only) |
| `DELETE` | `/api/v1/groups/:groupId` | Delete group (admin only) |
| `POST` | `/api/v1/groups/:groupId/members` | Add a member to the group (admin only) |
| `DELETE` | `/api/v1/groups/:groupId/members/:memberId` | Remove member (admin or self) |
| `PATCH` | `/api/v1/groups/:groupId/members/:memberId/role` | Update member role (admin only) |

**Create group example:**

```json
POST /api/v1/groups
{
  "name": "Engineering Team",
  "description": "All engineering department members"
}
```

**Add member example:**

```json
POST /api/v1/groups/:groupId/members
{
  "userId": "9b1deb4d-...",
  "role": "MEMBER"
}
```

**Group protection:**
- Cannot remove the last ADMIN (must promote another member first)
- Members can leave groups themselves
- Deleting a group cascades to all `ResourcePermission` entries granted to that group

#### Direct Sharing

Share files or folders with specific users or groups. Creates both a `Share` record (for tracking) and a `ResourcePermission` entry (for access control).

**Share API:**

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/shares/direct` | Share a resource with a specific user |
| `POST` | `/api/v1/shares/group` | Share a resource with a group |
| `GET` | `/api/v1/shares/my` | List resources I have shared |
| `GET` | `/api/v1/shares/with-me` | List resources shared with me |
| `DELETE` | `/api/v1/shares/:shareId` | Revoke a share |

**Share with user example:**

```json
POST /api/v1/shares/direct
{
  "fileId": "3fa85f64-...",
  "targetUserId": "9b1deb4d-...",
  "role": "EDITOR"
}
```

**Share with group example:**

```json
POST /api/v1/shares/group
{
  "folderId": "c1a2b3d4-...",
  "targetGroupId": "7e8f9a0b-...",
  "role": "VIEWER"
}
```

All share operations require `canShare` permission on the resource. Revoking removes both the Share record and the underlying ResourcePermission.

#### Email Invitations

Invite users to access resources via email address. If the invitee already has an account, the invitation is linked immediately. When a new user signs up with that email, pending invitations are automatically discovered.

**Invitation API:**

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/invitations` | Send an invitation |
| `GET` | `/api/v1/invitations/sent` | List invitations I've sent |
| `GET` | `/api/v1/invitations/received` | List invitations sent to me |
| `POST` | `/api/v1/invitations/:invitationId/accept` | Accept an invitation |
| `POST` | `/api/v1/invitations/:invitationId/decline` | Decline an invitation |
| `POST` | `/api/v1/invitations/:invitationId/cancel` | Cancel invitation (inviter only) |

**Send invitation example:**

```json
POST /api/v1/invitations
{
  "folderId": "3fa85f64-...",
  "inviteeEmail": "colleague@example.com",
  "role": "EDITOR",
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

**Invitation lifecycle:**

```
PENDING  → accept()  → ACCEPTED (grants permission)
         → decline() → DECLINED (no permission granted)
         → cancel()  → (deleted)
         → (expires) → EXPIRED (auto-marked if expiresAt passed)
```

**Invitation features:**
- Optional expiration date
- Auto-link to existing user accounts by email
- Only the invitee (matching email) can accept/decline
- Only the inviter can cancel
- Accepting grants a `ResourcePermission` and updates status to `ACCEPTED`

#### Schema Design

Phase 9 uses nullable foreign keys for polymorphic relationships:

```prisma
model Share {
  id           String         @id
  folderId     String?        // nullable FK
  fileId       String?        // nullable FK (exactly one must be set)
  createdById  String
  sharedWithId String?        // for user shares
  groupId      String?        // for group shares (exactly one must be set)
  role         PermissionRole
}

model Invitation {
  id           String         @id
  folderId     String?
  fileId       String?
  invitedById  String
  inviteeEmail String
  inviteeId    String?        // linked when user exists
  role         PermissionRole
  status       InviteStatus   // PENDING, ACCEPTED, DECLINED, EXPIRED
  expiresAt    DateTime?
}

model Group {
  id          String  @id
  name        String  @unique
  description String?
  members     GroupMember[]
}

model GroupMember {
  id      String  @id
  groupId String
  userId  String
  role    String  // ADMIN or MEMBER
}
```

#### Integration with Permission Engine

All share and invitation operations leverage Phase 8's `PermissionService`:
- Sharing requires `canShare` permission (checked before creating Share/Invitation)
- Group shares create `ResourcePermission` entries with `groupId` set
- Accepting an invitation creates a `ResourcePermission` with the granted role
- Permission resolution (Phase 8) automatically includes group memberships

**Example flow: Group share**

```
1. User calls POST /api/v1/shares/group
2. ShareService checks PermissionService.canShare(actorId, 'folder', folderId)
3. Creates ResourcePermission { folderId, groupId, role: VIEWER }
4. Creates Share { folderId, groupId, role: VIEWER } for tracking
5. All group members now inherit VIEWER on that folder
```

---

### Phase 10 — Trash + Recovery

Soft delete implementation with trash bin, recovery, and automatic cleanup. Files and folders are moved to trash instead of being permanently deleted, with a 30-day retention period before automatic permanent deletion.

#### Trash Operations

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/trash` | Move file or folder to trash (soft delete) |
| `GET` | `/api/v1/trash` | List all items in trash with expiration dates |
| `POST` | `/api/v1/trash/:trashItemId/restore` | Restore item from trash |
| `DELETE` | `/api/v1/trash/:trashItemId` | Permanently delete item from trash |
| `DELETE` | `/api/v1/trash/empty/all` | Empty entire trash (permanent delete all) |

**Move to trash example:**

```json
POST /api/v1/trash
{
  "fileId": "3fa85f64-..."
}
```

**Trash item response:**

```json
{
  "id": "7e8f9a0b-...",
  "type": "file",
  "originalPath": "/Documents/report.pdf",
  "deletedAt": "2026-09-21T10:30:00Z",
  "expiresAt": "2026-10-21T10:30:00Z",
  "resource": {
    "id": "3fa85f64-...",
    "name": "report.pdf",
    "size": "1048576",
    "mimeType": "application/pdf",
    "ownerId": "9b1deb4d-..."
  }
}
```

#### Soft Delete Workflow

```
DELETE /files/:id or /folders/:id
  ↓
FileService.deleteFile() or FolderService.deleteFolder()
  ↓
TrashService.moveToTrash()
  ↓
  1. Set isTrashed=true, trashedAt=now
  2. Create TrashItem record with originalPath
  3. For folders: recursively mark all descendants as trashed
  ↓
Item appears in trash bin (GET /api/v1/trash)
  ↓
30-day retention period
  ↓
autoCleanup() → permanent deletion
```

#### Folder Tree Behavior

When a folder is trashed:
- The folder and **all descendants** (subfolders + files) are marked `isTrashed=true`
- Only one TrashItem is created (for the top-level folder)
- Restoring the folder restores the entire tree
- Permanently deleting removes the entire tree and decrements quota

**Example:**

```
Documents (trashed)
  ├── University        ← also trashed (recursive)
  │   ├── Projects      ← also trashed
  │   └── report.pdf   ← also trashed
  └── CV.pdf           ← also trashed
```

Restore `Documents` → entire tree restored with original structure.

#### Permanent Deletion

Permanent deletion:
- Deletes physical files from disk
- Removes all database records (File/Folder + TrashItem)
- Decrements user's storage quota by total size
- Cannot be undone

**Automatic cleanup:**
- Runs daily (or on-demand via TrashService.autoCleanup())
- Permanently deletes items older than 30 days
- Can be triggered manually or via cron job

#### Access Control

- Only **owners** can trash, restore, or permanently delete their resources
- Trash operations bypass `canDelete` permission checks (ownership is sufficient)
- Trashed items are excluded from normal file/folder listings
- Users can only see their own trashed items

#### Integration with Existing Services

**FileService & FolderService:**
- `deleteFile()` and `deleteFolder()` now delegate to `TrashService`
- Consistent trash handling across all deletion operations
- Existing DELETE routes automatically use soft delete

**Storage Quota:**
- Trashed files still count toward quota
- Quota is decremented only on permanent deletion
- `QuotaService.decrementUsage()` called after physical file removal

---

### Phase 11 — File Versioning

Automatic version history for files with restore capabilities.

**Endpoints:**

```
GET    /api/v1/files/:fileId/versions          # List all versions of a file
GET    /api/v1/versions/:id                     # Get version details
POST   /api/v1/versions/:id/restore             # Restore a specific version
GET    /api/v1/versions/:id/download            # Download a specific version
DELETE /api/v1/versions/:id                     # Delete a specific version
DELETE /api/v1/files/:fileId/versions           # Delete all versions (keep current)
```

#### Version Operations

**List versions:**

```bash
GET /api/v1/files/3fa85f64-.../versions?limit=10
```

**Response:**

```json
{
  "success": true,
  "message": "File versions retrieved successfully",
  "data": [
    {
      "id": "7e8f9a0b-...",
      "fileId": "3fa85f64-...",
      "versionNum": 3,
      "path": "uploads/versions/...",
      "size": 2048576,
      "createdAt": "2026-09-21T14:30:00Z"
    },
    {
      "id": "6d7e8f9a-...",
      "fileId": "3fa85f64-...",
      "versionNum": 2,
      "path": "uploads/versions/...",
      "size": 2020000,
      "createdAt": "2026-09-20T10:15:00Z"
    }
  ],
  "meta": {
    "total": 3,
    "maxVersionsPerFile": 10
  }
}
```

**Restore version:**

```bash
POST /api/v1/versions/7e8f9a0b-.../restore
```

Restores the specified version as the current file content. Automatically creates a backup of the current version before restoring.

**Download version:**

```bash
GET /api/v1/versions/7e8f9a0b-.../download
```

Downloads a specific version with a timestamped filename (e.g., `report_v3_20260921.pdf`).

#### Automatic Versioning Workflow

```
File Upload/Update
  ↓
VersionService.createVersion()
  ↓
  1. Copy current file to versions directory
  2. Create FileVersion record (increment versionNum)
  3. Check version limit (MAX_VERSIONS_PER_FILE)
  ↓
If limit exceeded:
  → enforceVersionLimit()
  → Delete oldest version (FIFO)
  → Keep latest N versions
```

#### Version Restore with Backup

```
POST /versions/:id/restore
  ↓
VersionService.restoreVersion()
  ↓
  1. Create backup of current file (new version)
  2. Copy specified version → current file location
  3. Update File record metadata (size, path if needed)
  4. Handle quota adjustments if size changed
  ↓
Current file now matches selected version
Previous current file preserved as a version
```

#### Version Limits & Cleanup

- **MAX_VERSIONS_PER_FILE:** 10 versions per file
- **FIFO cleanup:** Oldest versions automatically deleted when limit exceeded
- **Manual cleanup:** Delete specific versions or all versions (keeps current)
- **Storage:** Versions stored in separate directory (`uploads/versions/`)
- **Quota:** Versions do NOT count toward user storage quota (only current file counts)

#### Download with Versioned Filenames

Version downloads use timestamped filenames for clarity:

```
Original: report.pdf
Version 3: report_v3_20260921.pdf
Version 2: report_v2_20260920.pdf
```

#### Access Control

- Users must have **VIEW** permission to list/download versions
- Users must have **EDIT** permission to restore versions
- Users must have **MANAGE** permission to delete versions
- Only file owners can delete all versions at once

#### Version Metadata

Each `FileVersion` record stores:
- `versionNum` — sequential version number (1, 2, 3...)
- `path` — physical path to version file
- `size` — version file size in bytes
- `createdAt` — timestamp of version creation

#### Integration Points

**Automatic version creation:**
- File upload (initial version creation)
- File copy operations
- Future: File update endpoint (when implemented)

**Version management:**
- Restore triggers new version creation (backup)
- Delete version removes physical file + record
- Trash operations do NOT affect versions (versions persist)

---

### Phase 12 — ZIP Compression + Extraction

Compress folders/files into ZIP archives and extract ZIP files with folder structure preservation.

**Endpoints:**

```
POST   /api/v1/zip/folder          # Compress a folder (recursive)
POST   /api/v1/zip/files            # Compress multiple files
POST   /api/v1/zip/extract          # Extract a ZIP file
```

#### ZIP Operations

**Compress folder:**

```bash
POST /api/v1/zip/folder
{
  "folderId": "3fa85f64-..."
}
```

**Response:**  
Returns a binary ZIP file download stream. The ZIP file includes the entire folder structure recursively.

**Filename format:** `FolderName_1695302400000.zip`

**Compress files:**

```bash
POST /api/v1/zip/files
{
  "fileIds": ["3fa85f64-...", "4gb96g75-...", "5hc07h86-..."]
}
```

**Response:**  
Returns a binary ZIP file download stream containing the specified files.

**Filename format:** `files_1695302400000.zip`  
**Limit:** Maximum 100 files per compression operation.

**Extract ZIP:**

```bash
POST /api/v1/zip/extract
{
  "fileId": "7e8f9a0b-...",
  "targetFolderId": "9b1deb4d-..."  // optional
}
```

**Response:**

```json
{
  "success": true,
  "message": "ZIP file extracted successfully",
  "data": {
    "extractedFiles": 42,
    "extractedFolders": 8,
    "totalSize": 15728640
  }
}
```

If `targetFolderId` is omitted, extracts to the ZIP file's parent folder.

#### Compression Workflow

```
POST /zip/folder or /zip/files
  ↓
ZipService.compressFolder() or .compressFiles()
  ↓
  1. Check permissions (user must have VIEW access)
  2. Create archiver instance (zlib level 9)
  3. Add files/folders recursively to archive
  4. Generate temp ZIP file in uploads/temp/
  5. Stream ZIP file for download
  ↓
res.download() → client receives ZIP
  ↓
Auto-cleanup: delete temp ZIP after download
```

#### Extraction Workflow

```
POST /zip/extract
  ↓
ZipService.extractZip()
  ↓
  1. Validate file is a ZIP archive
  2. Check permissions (VIEW on ZIP, WRITE on target folder)
  3. Calculate uncompressed size
  4. Check user quota (must have space for extraction)
  ↓
  5. Extract entries:
     - Directories → create Folder records
     - Files → create File records + write to disk
  6. Preserve folder structure (nested paths)
  7. Increment quota by total extracted size
  ↓
Return extraction statistics
```

#### Folder Structure Preservation

**Example ZIP structure:**

```
Documents.zip
  ├── University/
  │   ├── Projects/
  │   │   └── thesis.pdf
  │   └── report.pdf
  └── CV.pdf
```

**After extraction:**

```
Target Folder
  └── University (Folder)
      ├── Projects (Folder)
      │   └── thesis.pdf (File)
      └── report.pdf (File)
  └── CV.pdf (File)
```

The entire nested folder hierarchy is recreated with proper parent-child relationships.

#### Quota & Storage Checks

**Compression:**
- No quota check (download only, no storage impact)
- Permission check: user must have VIEW access to all files/folders

**Extraction:**
- Pre-extraction quota check: calculates uncompressed ZIP size
- Fails if user has insufficient quota
- Quota incremented only after successful extraction
- Each extracted file counts toward quota individually

#### Access Control

**Compress folder:**
- User must have **VIEW** permission for the folder
- Permission propagates to all descendants (recursive check)

**Compress files:**
- User must have **VIEW** permission for each file
- Permission check performed for all file IDs before compression

**Extract ZIP:**
- User must have **VIEW** permission for the ZIP file
- User must have **WRITE** permission for the target folder
- Extracted files are owned by the user performing extraction

#### Temporary File Management

**Compression:**
- Temp ZIP files created in `uploads/temp/` directory
- Auto-deleted after download completion
- Manual cleanup via `ZipService.cleanupTempZip()`

**Extraction:**
- Extracted files written directly to `uploads/` directory
- No temporary storage (direct write-through)
- File records created in database immediately

#### MIME Type Detection

Extracted files automatically get MIME types based on file extensions:

```typescript
.pdf  → application/pdf
.txt  → text/plain
.jpg  → image/jpeg
.png  → image/png
.zip  → application/zip
.mp4  → video/mp4
// ... etc
```

Falls back to `application/octet-stream` for unknown extensions.

#### Compression Level

Uses **zlib level 9** (maximum compression) via archiver:

```typescript
archiver('zip', { zlib: { level: 9 } })
```

Provides optimal file size reduction at the cost of slightly longer compression time.

#### Error Handling

**Compression failures:**
- File not found on disk (logs warning, continues)
- Permission denied (rejects before compression)
- Archive write errors (rejects, no partial download)

**Extraction failures:**
- Invalid ZIP format (rejects before extraction)
- Quota exceeded (rejects before extraction)
- Target folder not found (rejects before extraction)
- Disk write errors (partial extraction possible)

#### Integration with Existing Services

**PermissionService:**
- All operations check appropriate permissions
- Recursive permission checks for folder compression

**QuotaService:**
- Pre-extraction quota validation
- Post-extraction quota increment

**FileService & FolderService:**
- Extracted files/folders created via existing services
- Maintains consistency with upload workflows

---

## Architecture

```
Internet
    ↓
Express Server (Node.js + TypeScript)
    ↓
    ├── JWT Authentication Middleware
    ├── Zod Validation
    ├── Business Logic (Services)
    ├── Prisma ORM
    │     ↓
    │   PostgreSQL (metadata, users, permissions)
    │
    └── Local Disk / S3 (file binaries)
```

**Request lifecycle:**
```
Request
  ↓ auth.middleware.ts   — verify JWT, attach req.user
  ↓ router               — match route
  ↓ controller           — parse & validate input (Zod), call service
  ↓ service              — business logic, Prisma, disk I/O
  ↓ sendResponse()       — { success, message, data, meta }
  ↓
Response
```

---

## Roadmap

| Phase | Feature | Status |
|---|---|---|
| 0 | Project Foundation | ✅ Done |
| 1 | Database + Prisma | ✅ Done |
| 2 | Express Backend Architecture | ✅ Done |
| 3 | Authentication + Account Security | ✅ Done |
| 4 | User Management | ✅ Done |
| 5 | Folder Management | ✅ Done |
| 6 | File Storage + File Operations | ✅ Done |
| 7 | Storage Quota + Storage Engine | ✅ Done |
| 8 | Authorization + Permission Engine | ✅ Done |
| 9 | Sharing + Groups + Invitations | ✅ Done |
| 10 | Trash + Recovery | ✅ Done |
| 11 | File Versioning | ✅ Done |
| 12 | ZIP Compression + Extraction | ✅ Done |
| 13 | Search | ⏳ Next |
| 14 | CLI / Command Interface | ⏳ Planned |
| 15 | Activity Logs + Notifications | ⏳ Planned |
| 16 | Admin System | ⏳ Planned |
| 17 | Real-Time Socket.IO | ⏳ Planned |
| 18 | Payments + Storage Upgrades | ⏳ Planned |
| 19 | Security + Testing | ⏳ Planned |
| 20 | Production Deployment | ⏳ Planned |
