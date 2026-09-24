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
  - [Phase 13 — Search](#phase-13--search)
  - [Phase 14 — CLI / Command Interface](#phase-14--cli--command-interface)
  - [Phase 15 — Activity Logs + Notifications](#phase-15--activity-logs--notifications)
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
│   │   ├── search.controller.ts
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
│   │   ├── search.routes.ts
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
│   │   ├── search.service.ts
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
│   │   ├── search.validation.ts
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

### Phase 13 — Search

Full-text search across files and folders with advanced filters, type categories, and special queries.

**Endpoints:**

```
GET    /api/v1/search                    # Global search (files + folders)
GET    /api/v1/search/files              # Search files with advanced filters
GET    /api/v1/search/folders            # Search folders with filters
GET    /api/v1/search/type/:category     # Search by file type category
GET    /api/v1/search/recent             # Get recently modified files
GET    /api/v1/search/large              # Get large files sorted by size
```

#### Search Operations

**Global search:**

```bash
GET /api/v1/search?query=report&page=1&limit=20
```

**Response:**

```json
{
  "success": true,
  "message": "Search completed successfully",
  "data": {
    "files": {
      "results": [
        {
          "id": "3fa85f64-...",
          "name": "annual-report.pdf",
          "size": 2048576,
          "mimeType": "application/pdf",
          "folderId": "9b1deb4d-...",
          "createdAt": "2026-09-20T10:00:00Z"
        }
      ],
      "total": 12,
      "page": 1,
      "limit": 10,
      "totalPages": 2
    },
    "folders": {
      "results": [
        {
          "id": "7e8f9a0b-...",
          "name": "Reports",
          "parentId": "5hc07h86-...",
          "createdAt": "2026-08-15T08:00:00Z",
          "_count": {
            "files": 8,
            "children": 2
          }
        }
      ],
      "total": 3,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    },
    "totalResults": 15
  }
}
```

**Advanced file search:**

```bash
GET /api/v1/search/files?query=presentation&mimeType=application/pdf&minSize=1000000&maxSize=50000000&startDate=2026-01-01&folderId=abc123&includeSubfolders=true&page=1&limit=20
```

Supports multiple filters:
- `query` — File name search (case-insensitive)
- `mimeType` — Filter by MIME type
- `minSize` / `maxSize` — Size range in bytes
- `startDate` / `endDate` — Creation date range
- `folderId` — Search within specific folder
- `includeSubfolders` — Recursive subfolder search

**Search by type category:**

```bash
GET /api/v1/search/type/image?page=1&limit=20
```

**Categories:**
- `image` — All image files (image/*)
- `video` — All video files (video/*)
- `audio` — All audio files (audio/*)
- `document` — Documents (PDF, Word, Excel, text files)
- `archive` — Compressed files (ZIP, RAR, 7Z, TAR)

**Response:**

```json
{
  "success": true,
  "message": "image files retrieved successfully",
  "data": [
    {
      "id": "3fa85f64-...",
      "name": "photo.jpg",
      "size": 1024768,
      "mimeType": "image/jpeg",
      "createdAt": "2026-09-20T10:00:00Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

#### Search Filters

**File search filters:**

| Filter | Type | Description |
|--------|------|-------------|
| `query` | string | File name search (case-insensitive contains) |
| `mimeType` | string | Filter by MIME type (partial match) |
| `minSize` | integer | Minimum file size in bytes |
| `maxSize` | integer | Maximum file size in bytes |
| `startDate` | date-time | Files created after this date |
| `endDate` | date-time | Files created before this date |
| `folderId` | uuid | Search within specific folder |
| `includeSubfolders` | boolean | Include all descendant folders (recursive) |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (1-100, default: 20) |

**Folder search filters:**

| Filter | Type | Description |
|--------|------|-------------|
| `query` | string | Folder name search (case-insensitive contains) |
| `startDate` | date-time | Folders created after this date |
| `endDate` | date-time | Folders created before this date |
| `folderId` | uuid | Search within specific parent folder |
| `includeSubfolders` | boolean | Include all descendant folders (recursive) |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (1-100, default: 20) |

#### Recursive Subfolder Search

When `includeSubfolders=true`, the search includes all descendant folders:

```
Documents (folderId: abc123)
  ├── University
  │   ├── Projects
  │   └── Lectures
  └── Work
      └── Reports
```

**Search in Documents with subfolders:**

```bash
GET /api/v1/search/files?folderId=abc123&includeSubfolders=true
```

Returns files from:
- Documents
- University
- Projects
- Lectures
- Work
- Reports

**Without subfolders (default):**

```bash
GET /api/v1/search/files?folderId=abc123
```

Returns files only from Documents (immediate children).

#### Special Search Queries

**Recent files:**

```bash
GET /api/v1/search/recent?limit=20
```

Returns recently modified files sorted by `updatedAt` (descending). Useful for "Recent Files" dashboard widgets.

**Large files:**

```bash
GET /api/v1/search/large?minSize=10485760&limit=20
```

Returns files sorted by size (descending). Default `minSize` is 10 MB (10,485,760 bytes). Useful for storage management and cleanup.

#### Search Performance

**Text search:**
- Uses case-insensitive `ILIKE` queries (PostgreSQL)
- Indexes on `name` field for faster lookups
- Limited to 255 characters per query

**Pagination:**
- All search endpoints support pagination
- Default limit: 20 results per page
- Maximum limit: 100 results per page
- Returns `total`, `page`, `limit`, `totalPages` metadata

**Filtering:**
- Multiple filters combined with AND logic
- Date ranges: inclusive on both sides
- Size ranges: supports open-ended queries (only min or only max)

#### Access Control

- All searches scoped to authenticated user (`ownerId`)
- Only non-trashed items returned (`isTrashed: false`)
- Shared files NOT included in search results (owner-only)
- No cross-user search capability

#### Response Format

**Standard pagination response:**

```json
{
  "success": true,
  "message": "...",
  "data": [ /* results array */ ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

**Global search response:**

```json
{
  "success": true,
  "message": "Search completed successfully",
  "data": {
    "files": { /* file results with pagination */ },
    "folders": { /* folder results with pagination */ },
    "totalResults": 150
  }
}
```

#### Type Category MIME Mappings

**Image:**
- All files starting with `image/` (JPEG, PNG, GIF, WebP, SVG, etc.)

**Video:**
- All files starting with `video/` (MP4, AVI, MOV, WebM, etc.)

**Audio:**
- All files starting with `audio/` (MP3, WAV, OGG, FLAC, etc.)

**Document:**
- `application/pdf`
- `application/msword` (DOC)
- `application/vnd.*` (DOCX, XLSX, PPTX, etc.)
- `text/*` (TXT, CSV, etc.)

**Archive:**
- `application/zip`
- `application/x-rar`
- `application/x-7z-compressed`
- `application/x-tar`

#### Use Cases

**Dashboard "Recent Files" widget:**
```bash
GET /api/v1/search/recent?limit=10
```

**Storage cleanup (find large files):**
```bash
GET /api/v1/search/large?minSize=52428800&limit=50  # Files > 50 MB
```

**Find all presentations in a folder:**
```bash
GET /api/v1/search/files?query=presentation&folderId=abc123&includeSubfolders=true
```

**Find all images created this month:**
```bash
GET /api/v1/search/type/image?startDate=2026-09-01&endDate=2026-09-30
```

**Search for specific file name:**
```bash
GET /api/v1/search/files?query=invoice-2026.pdf
```

**Browse all documents:**
```bash
GET /api/v1/search/type/document?page=1&limit=50
```

#### Integration with Existing Services

**PermissionService:**
- Search results scoped to user's own files only
- No permission checks needed (ownership implies full access)

**FileService & FolderService:**
- Uses same Prisma models and selection patterns
- Consistent response format across endpoints

**Future Enhancements:**
- Full-text search inside document content (OCR, PDF text extraction)
- Search across shared files (with permission filtering)
- Tag-based search (requires tag system implementation)
- Saved searches and search history
- Search suggestions and autocomplete

---

### Phase 14 — CLI / Command Interface

Command-line interface for NexaDrive with full file management, authentication, and utility commands.

**Installation:**

```bash
# Build the CLI
npm run build:cli

# Run CLI locally (development)
npm run cli -- <command>

# Install globally (optional)
npm link
nexadrive <command>
```

**Configuration:**

The CLI stores authentication tokens and settings in `~/.nexadrive/config.json`.

Default API URL: `http://localhost:5000/api/v1`

#### Command Groups

**Authentication Commands:**

```bash
nexadrive auth login              # Login to NexaDrive
nexadrive auth register           # Register a new account
nexadrive auth logout             # Logout from NexaDrive
nexadrive auth whoami             # Show current user information
```

**File Commands:**

```bash
nexadrive files upload <file> [-f, --folder <folderId>]
nexadrive files download <fileId> [-o, --output <path>]
nexadrive files list [-f, --folder <folderId>] [-p, --page <n>] [-l, --limit <n>]
nexadrive files delete <fileId>
nexadrive files search <query> [-t, --type <mime>] [--min-size <bytes>] [--max-size <bytes>]
nexadrive files info <fileId>
```

**Folder Commands:**

```bash
nexadrive folders create <name> [-p, --parent <folderId>] [-v, --visibility <type>]
nexadrive folders list [-p, --parent <folderId>] [--page <n>] [-l, --limit <n>]
nexadrive folders info <folderId>
nexadrive folders delete <folderId>
nexadrive folders rename <folderId> <newName>
```

**Utility Commands:**

```bash
nexadrive quota                   # Show storage quota information
nexadrive recent [-l, --limit <n>]  # Show recently modified files
nexadrive large [--min-size <bytes>] [-l, --limit <n>]  # Show largest files
nexadrive trash [-p, --page <n>] [-l, --limit <n>]  # List items in trash
nexadrive search <query> [-p, --page <n>] [-l, --limit <n>]  # Global search
```

#### Usage Examples

**Authentication:**

```bash
# Login
$ nexadrive auth login
? Email: user@example.com
? Password: ********
✓ Logged in as user@example.com

# Check current user
$ nexadrive auth whoami
Current User:
  Email: user@example.com
  Username: johndoe
  User ID: 3fa85f64-...
  API URL: http://localhost:5000/api/v1
```

**File Operations:**

```bash
# Upload a file
$ nexadrive files upload ./document.pdf
✓ File uploaded successfully: document.pdf
ℹ File ID: 3fa85f64-5717-4562-b3fc-2c963f66afa6
ℹ Size: 2.45 MB

# Upload to specific folder
$ nexadrive files upload ./photo.jpg --folder 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d

# List files
$ nexadrive files list --limit 5
Files:

Name                          | Size      | Type                 | Created          | ID
------------------------------|-----------|----------------------|------------------|----------
annual-report.pdf             | 2.45 MB   | application/pdf      | 9/20/2026, 10:00 | 3fa85f64...
presentation.pptx             | 5.12 MB   | application/vnd.open | 9/19/2026, 14:30 | 4gb96g75...
photo.jpg                     | 1.24 MB   | image/jpeg           | 9/18/2026, 09:15 | 5hc07h86...

ℹ Page 1 of 3 (12 total)

# Download a file
$ nexadrive files download 3fa85f64-... -o ./downloads/report.pdf
✓ File downloaded: ./downloads/report.pdf

# Search files
$ nexadrive files search "report" --type pdf
Search Results:

Name                          | Size      | Type                 | Created          | ID
------------------------------|-----------|----------------------|------------------|----------
annual-report.pdf             | 2.45 MB   | application/pdf      | 9/20/2026, 10:00 | 3fa85f64...
q3-report.pdf                 | 1.87 MB   | application/pdf      | 9/15/2026, 11:20 | 6id18i97...

ℹ Found 2 files (page 1 of 1)

# Get file details
$ nexadrive files info 3fa85f64-...
File Information:
  Name: annual-report.pdf
  ID: 3fa85f64-5717-4562-b3fc-2c963f66afa6
  Size: 2.45 MB
  MIME Type: application/pdf
  Visibility: PRIVATE
  Version: 1
  Created: 9/20/2026, 10:00:00 AM
  Updated: 9/20/2026, 10:00:00 AM
  Owner ID: 9b1deb4d-...
  Folder ID: 7e8f9a0b-...
```

**Folder Operations:**

```bash
# Create a folder
$ nexadrive folders create "Projects" --visibility PRIVATE
✓ Folder created: Projects
ℹ Folder ID: 7e8f9a0b-...

# Create subfolder
$ nexadrive folders create "2026" --parent 7e8f9a0b-...

# List folders
$ nexadrive folders list
Folders:

Name                                | Visibility | Created          | ID
------------------------------------|------------|------------------|----------
Documents                           | PRIVATE    | 9/15/2026, 08:00 | 5hc07h86...
Projects                            | PRIVATE    | 9/18/2026, 09:30 | 7e8f9a0b...
Photos                              | SHARED     | 9/10/2026, 14:00 | 8jf19j08...

ℹ Page 1 of 1 (3 total)

# Get folder details
$ nexadrive folders info 7e8f9a0b-...
Folder Information:
  Name: Projects
  ID: 7e8f9a0b-...
  Visibility: PRIVATE
  Created: 9/18/2026, 09:30:00 AM
  Updated: 9/18/2026, 09:30:00 AM
  Owner ID: 9b1deb4d-...

  Subfolders: 2
    - 2026 (6id18i97...)
    - Archive (7je29j19...)

# Rename folder
$ nexadrive folders rename 7e8f9a0b-... "Work Projects"
✓ Folder renamed to: Work Projects
```

**Utility Commands:**

```bash
# Check quota
$ nexadrive quota
Storage Quota:
  Used: 127.45 MB
  Total: 5.00 GB
  Available: 4.88 GB
  Usage: 2.49%
  Status: ✅ OK

Counts:
  Files: 42
  Folders: 8
  Trashed Items: 3

# Recent files
$ nexadrive recent --limit 5
Recent Files:

Name                          | Size      | Type                 | Modified         | ID
------------------------------|-----------|----------------------|------------------|----------
notes.txt                     | 4.12 KB   | text/plain           | 9/21/2026, 16:45 | 8jf19j08...
report.pdf                    | 2.45 MB   | application/pdf      | 9/21/2026, 14:20 | 3fa85f64...
photo.jpg                     | 1.24 MB   | image/jpeg           | 9/21/2026, 09:15 | 5hc07h86...

# Large files
$ nexadrive large --min-size 5000000 --limit 5
Large Files:

Name                          | Size      | Type                 | Created          | ID
------------------------------|-----------|----------------------|------------------|----------
video.mp4                     | 45.67 MB  | video/mp4            | 9/18/2026, 11:00 | 9kg20k20...
presentation.pptx             | 5.12 MB   | application/vnd.open | 9/19/2026, 14:30 | 4gb96g75...

ℹ Showing files larger than 4.77 MB

# Global search
$ nexadrive search "presentation"
Files:

Name                          | Size      | Type                 | ID
------------------------------|-----------|----------------------|----------
presentation.pptx             | 5.12 MB   | application/vnd.open | 4gb96g75...
sales-presentation.pdf        | 3.21 MB   | application/pdf      | 7je29j19...

Folders:

Name                                | Visibility | ID
------------------------------------|------------|----------
Presentations                       | PRIVATE    | 8jf19j08...

ℹ Found 3 total results (2 files, 1 folders)

# List trash
$ nexadrive trash
Trash Items:

Name                     | Type   | Deleted          | Expires          | ID
-------------------------|--------|------------------|------------------|----------
old-notes.txt            | file   | 9/15/2026, 10:00 | 10/15/2026, 10:0 | 6id18i97...
Archive                  | folder | 9/10/2026, 14:00 | 10/10/2026, 14:0 | 7je29j19...

ℹ Page 1 of 1 (2 total)
```

#### CLI Features

**Interactive Prompts:**
- Password masking for secure input
- Input validation with helpful error messages
- Confirmation prompts for destructive operations

**Progress Indicators:**
- Spinner animations for long-running operations
- Clear success/error messages with color coding
- Detailed operation feedback

**Output Formatting:**
- Color-coded messages (green = success, red = error, blue = info)
- Tabular output for lists
- Human-readable file sizes (B, KB, MB, GB)
- Formatted dates and timestamps

**Error Handling:**
- API error messages displayed clearly
- Network error detection
- Authentication error handling with re-login prompts

#### Configuration Management

**Config File Location:**
```
~/.nexadrive/config.json
```

**Config Structure:**
```json
{
  "apiUrl": "http://localhost:5000/api/v1",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "9b1deb4d-...",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

**Environment Variables:**

You can override the default API URL:

```bash
# Set custom API URL in config before login
# Or modify ~/.nexadrive/config.json directly
```

#### Development

**Run CLI in development mode:**

```bash
npm run cli -- <command>
```

**Build CLI for distribution:**

```bash
npm run build:cli
```

**Install CLI globally for testing:**

```bash
npm link
nexadrive <command>
```

**Uninstall global CLI:**

```bash
npm unlink -g nexadrive
```

#### Architecture

**CLI Structure:**

```
cli/
├── index.ts              # Main CLI entry point
├── commands/
│   ├── auth.ts           # Authentication commands
│   ├── files.ts          # File operations
│   ├── folders.ts        # Folder operations
│   └── utils.ts          # Utility commands
└── utils/
    ├── config.ts         # Configuration management
    ├── api.ts            # API client wrapper
    └── format.ts         # Output formatting utilities
```

**Dependencies:**
- `commander` — CLI framework and command parsing
- `inquirer` — Interactive prompts
- `chalk` — Terminal color output
- `ora` — Progress spinners
- `axios` — HTTP client for API requests
- `form-data` — Multipart form uploads

**Authentication Flow:**

```
1. User runs: nexadrive auth login
2. CLI prompts for email and password
3. API request to /auth/login
4. Store accessToken, refreshToken, and user info in ~/.nexadrive/config.json
5. Future commands use stored token in Authorization header
```

**File Upload Flow:**

```
1. User runs: nexadrive files upload ./file.pdf
2. CLI reads file from disk
3. Create FormData with file and optional folderId
4. POST to /files/upload with multipart/form-data
5. Display success message with file ID
```

**File Download Flow:**

```
1. User runs: nexadrive files download <fileId>
2. GET file metadata from /files/:id
3. GET file stream from /files/:id/download
4. Pipe stream to output file
5. Display success message with output path
```

#### Future Enhancements

- **Auto-completion:** Shell completion scripts for bash/zsh
- **Config command:** Interactive config management
- **Batch operations:** Upload/download multiple files
- **Progress bars:** File upload/download progress
- **Watch mode:** Auto-upload on file changes
- **Sync command:** Bi-directional folder sync
- **Share commands:** Create and manage shares via CLI
- **Version commands:** Manage file versions
- **Interactive mode:** REPL-style interface
- **Output formats:** JSON output for scripting

---

### Phase 15 — Activity Logs + Notifications

Track user actions with detailed activity logs and send real-time notifications for important events.

**Endpoints:**

**Activities:**
```
GET    /api/v1/activities              # Get activities with filtering
GET    /api/v1/activities/recent       # Get recent activities
GET    /api/v1/activities/stats        # Get activity statistics
```

**Notifications:**
```
GET    /api/v1/notifications           # Get notifications
GET    /api/v1/notifications/unread-count  # Get unread count
PATCH  /api/v1/notifications/:id/read  # Mark as read
PATCH  /api/v1/notifications/read-all  # Mark all as read
DELETE /api/v1/notifications/:id       # Delete notification
DELETE /api/v1/notifications/read      # Delete all read
```

#### Activity Logging

**Activity Actions:**

| Action | Description |
|--------|-------------|
| LOGIN | User logged in |
| LOGOUT | User logged out |
| UPLOAD | File uploaded |
| DOWNLOAD | File downloaded |
| CREATE_FOLDER | Folder created |
| RENAME | File or folder renamed |
| MOVE | File or folder moved |
| COPY | File copied |
| DELETE | File or folder moved to trash |
| RESTORE | File or folder restored from trash |
| SHARE | Resource shared with user/group |
| PERMISSION_CHANGE | Permission modified |
| INVITE | Invitation sent |
| ACCEPT_INVITATION | Invitation accepted |

**Get activities with filters:**

```bash
GET /api/v1/activities?action=UPLOAD&startDate=2026-09-01&endDate=2026-09-30&page=1&limit=20
```

**Response:**

```json
{
  "success": true,
  "message": "Activities retrieved successfully",
  "data": [
    {
      "id": "3fa85f64-...",
      "action": "UPLOAD",
      "details": {
        "resourceId": "7e8f9a0b-...",
        "resourceName": "report.pdf",
        "resourceType": "file",
        "fileSize": 2048576
      },
      "ipAddress": "192.168.1.100",
      "createdAt": "2026-09-20T10:30:00Z"
    },
    {
      "id": "4gb96g75-...",
      "action": "CREATE_FOLDER",
      "details": {
        "resourceId": "8jf19j08-...",
        "resourceName": "Projects",
        "resourceType": "folder"
      },
      "ipAddress": "192.168.1.100",
      "createdAt": "2026-09-19T14:15:00Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

**Get recent activities:**

```bash
GET /api/v1/activities/recent?limit=10
```

Returns the 10 most recent activities sorted by timestamp (descending).

**Get activity statistics:**

```bash
GET /api/v1/activities/stats?days=7
```

**Response:**

```json
{
  "success": true,
  "message": "Activity statistics retrieved successfully",
  "data": {
    "totalActivities": 127,
    "actionCounts": {
      "LOGIN": 15,
      "UPLOAD": 42,
      "DOWNLOAD": 28,
      "CREATE_FOLDER": 8,
      "DELETE": 12,
      "SHARE": 6
    },
    "dailyCounts": {
      "2026-09-15": 18,
      "2026-09-16": 22,
      "2026-09-17": 15,
      "2026-09-18": 20,
      "2026-09-19": 25,
      "2026-09-20": 17,
      "2026-09-21": 10
    },
    "period": "7 days"
  }
}
```

#### Activity Details Structure

Each activity includes a `details` JSON field with action-specific information:

**Upload Activity:**
```json
{
  "resourceId": "file-uuid",
  "resourceName": "document.pdf",
  "resourceType": "file",
  "fileSize": 2048576,
  "mimeType": "application/pdf",
  "folderId": "folder-uuid"
}
```

**Share Activity:**
```json
{
  "resourceId": "file-or-folder-uuid",
  "resourceName": "Report 2026",
  "resourceType": "file",
  "shareWith": "john@example.com",
  "permission": "EDIT"
}
```

**Move Activity:**
```json
{
  "resourceId": "file-uuid",
  "resourceName": "photo.jpg",
  "resourceType": "file",
  "fromPath": "/Documents/Photos",
  "toPath": "/Archive/2026"
}
```

**Delete Activity:**
```json
{
  "resourceId": "folder-uuid",
  "resourceName": "Old Projects",
  "resourceType": "folder",
  "deletedItems": 12
}
```

#### Notifications

**Notification Types:**

| Type | Description |
|------|-------------|
| SHARE | Resource shared with you |
| DOWNLOAD | Someone downloaded your file |
| QUOTA_ALERT | Storage quota warning/critical alert |
| INVITATION | Invitation to access a resource |
| PERMISSION_CHANGE | Your permissions changed |
| FILE_UPLOADED | New file uploaded to shared folder |
| COMMENT | Comment on your resource |

**Get notifications:**

```bash
GET /api/v1/notifications?page=1&limit=20&unreadOnly=true
```

**Response:**

```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": [
    {
      "id": "9kg20k20-...",
      "title": "New Share",
      "message": "John Doe shared a file \"Q3 Report.pdf\" with you",
      "type": "SHARE",
      "isRead": false,
      "createdAt": "2026-09-21T10:30:00Z"
    },
    {
      "id": "0lh31l31-...",
      "title": "Storage Warning",
      "message": "Your storage is 85% full. Consider cleaning up files.",
      "type": "QUOTA_ALERT",
      "isRead": false,
      "createdAt": "2026-09-20T08:00:00Z"
    }
  ],
  "meta": {
    "total": 8,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Get unread count:**

```bash
GET /api/v1/notifications/unread-count
```

**Response:**

```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": {
    "count": 8
  }
}
```

**Mark notification as read:**

```bash
PATCH /api/v1/notifications/9kg20k20-.../read
```

**Mark all as read:**

```bash
PATCH /api/v1/notifications/read-all
```

Returns the count of notifications marked as read.

**Delete notification:**

```bash
DELETE /api/v1/notifications/9kg20k20-...
```

**Delete all read notifications:**

```bash
DELETE /api/v1/notifications/read
```

Returns the count of deleted notifications.

#### Notification Helpers

The `NotificationService` provides helper methods to create common notifications:

**Share notification:**
```typescript
NotificationService.notifyShare(
  recipientId,
  'John Doe',
  'Q3 Report.pdf',
  'file'
);
```

**Download notification:**
```typescript
NotificationService.notifyDownload(
  ownerId,
  'Jane Smith',
  'document.pdf'
);
```

**Quota alert:**
```typescript
NotificationService.notifyQuotaAlert(
  userId,
  85.5, // usage percent
  'warning' // or 'critical'
);
```

**Invitation notification:**
```typescript
NotificationService.notifyInvitation(
  recipientId,
  'Admin User',
  'Projects Folder',
  'folder'
);
```

#### Activity Logging Integration

Activities are automatically logged for key operations:

**Already Integrated:**
- ✅ Login (LOGIN action)
- ✅ Registration (REGISTER action - custom action, not in enum)

**Ready to Integrate:**

Call `ActivityService.logActivity()` from any service:

```typescript
import { ActivityService, ActivityAction } from '../services/activity.service';

// Log file upload
await ActivityService.logActivity(
  userId,
  ActivityAction.UPLOAD,
  {
    resourceId: file.id,
    resourceName: file.name,
    resourceType: 'file',
    fileSize: file.size,
  },
  req.ip
);

// Log folder creation
await ActivityService.logActivity(
  userId,
  ActivityAction.CREATE_FOLDER,
  {
    resourceId: folder.id,
    resourceName: folder.name,
    resourceType: 'folder',
  }
);

// Log share operation
await ActivityService.logActivity(
  userId,
  ActivityAction.SHARE,
  {
    resourceId: share.resourceId,
    resourceName: resourceName,
    resourceType: share.resourceType,
    shareWith: recipientEmail,
    permission: share.permission,
  }
);
```

#### Activity Filters

**Filter by action:**
```bash
GET /api/v1/activities?action=UPLOAD
```

**Filter by date range:**
```bash
GET /api/v1/activities?startDate=2026-09-01&endDate=2026-09-30
```

**Combine filters:**
```bash
GET /api/v1/activities?action=SHARE&startDate=2026-09-15&page=1&limit=10
```

#### Notification Workflow

```
User Action (e.g., share file)
  ↓
Service completes operation
  ↓
NotificationService.notifyShare() called
  ↓
Notification record created in database
  ↓
Recipient sees notification badge (unread count)
  ↓
GET /api/v1/notifications (recipient)
  ↓
User clicks notification → PATCH /mark as read
  ↓
Badge count decreases
```

#### Activity Data Retention

**Cleanup old activities:**

The `ActivityService.deleteOldActivities(days)` method removes activities older than the specified days:

```typescript
// Delete activities older than 90 days
const deletedCount = await ActivityService.deleteOldActivities(90);
```

**Recommended retention:**
- **Development:** 30 days
- **Production:** 90-365 days (depending on compliance requirements)

Can be run as a scheduled job (cron) for automatic cleanup.

#### Access Control

**Activities:**
- Users can only view their own activities
- No cross-user activity viewing
- Admins could be given access to all activities (not currently implemented)

**Notifications:**
- Users can only view/manage their own notifications
- Notifications are user-scoped by design
- No sharing or forwarding of notifications

#### Use Cases

**Activity Logs:**
- **Audit trail:** Track all user actions for security/compliance
- **Debugging:** Investigate user-reported issues
- **Analytics:** Understand user behavior patterns
- **Dashboard widgets:** Show recent user activity

**Notifications:**
- **Collaboration alerts:** Notify when files are shared
- **Download tracking:** Notify owners when files are downloaded
- **Storage management:** Alert users when quota is near full
- **Invitation workflow:** Notify users of pending invitations

#### Performance Considerations

**Activity Logging:**
- Logging is **non-blocking** (errors don't break main operations)
- Uses `try-catch` to prevent logging failures from affecting user actions
- Indexed on `userId` and `createdAt` for fast queries

**Notifications:**
- Paginated results (default 20, max 100 per page)
- Unread count is efficient (`COUNT` query with `WHERE isRead = false`)
- Batch operations (mark all as read, delete all read) for efficiency

#### Future Enhancements

**Activities:**
- **Real-time activity feed:** WebSocket updates for live activity stream
- **Export activities:** Download activity logs as CSV/JSON
- **Advanced filtering:** Filter by resource type, IP address
- **Activity search:** Full-text search across activity details

**Notifications:**
- **Real-time notifications:** WebSocket push notifications
- **Email notifications:** Send email for critical alerts
- **Notification preferences:** User-configurable notification settings
- **Notification grouping:** Combine similar notifications
- **Action buttons:** Quick actions directly from notification (approve/deny)

---

### Phase 16 — Admin System & Management

Comprehensive administrator dashboard for user management, system monitoring, and platform administration.

**Endpoints:**

**User Management:**
```
GET    /api/v1/admin/users              # List all users (paginated + filters)
GET    /api/v1/admin/users/:userId      # Get detailed user information
PUT    /api/v1/admin/users/:userId/role # Update user role (promote/demote)
PUT    /api/v1/admin/users/:userId/status # Suspend or activate user
PUT    /api/v1/admin/users/:userId/quota  # Update storage quota
DELETE /api/v1/admin/users/:userId      # Delete user permanently
```

**Statistics & Monitoring:**
```
GET    /api/v1/admin/stats/system       # System-wide statistics
GET    /api/v1/admin/stats/storage      # Storage breakdown & top users
GET    /api/v1/admin/stats/activity     # Activity statistics by time period
GET    /api/v1/admin/activities         # Recent system activities (all users)
```

**System Maintenance:**
```
POST   /api/v1/admin/cleanup            # Clean up old data (trash, logs, tokens)
```

#### Authentication & Authorization

All admin endpoints require:
1. **Authentication:** Valid JWT token (`authenticateUser` middleware)
2. **Admin Role:** User must have `role: ADMIN` (`requireAdmin` middleware)

**Access denied for non-admin users:**
```json
{
  "success": false,
  "message": "Access denied. Administrator privileges required.",
  "data": null
}
```

#### User Management

**List all users with filters:**

```bash
GET /api/v1/admin/users?page=1&limit=20&role=USER&isActive=true&search=john
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page, max 100 (default: 20)
- `role` (optional): Filter by role (`USER` or `ADMIN`)
- `isActive` (optional): Filter by active status (`true` or `false`)
- `search` (optional): Search by email, username, or name

**Response:**

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "550e8400-...",
        "name": "John Doe",
        "email": "john@example.com",
        "username": "johndoe",
        "avatar": "https://...",
        "role": "USER",
        "isActive": true,
        "isEmailVerified": true,
        "storageQuota": "549755813888",
        "usedStorage": "104857600",
        "createdAt": "2026-01-15T10:30:00Z",
        "updatedAt": "2026-09-20T14:22:00Z",
        "_count": {
          "files": 42,
          "folders": 8,
          "activityLogs": 127
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

**Get detailed user information:**

```bash
GET /api/v1/admin/users/550e8400-...
```

Returns comprehensive user details including:
- Basic profile information
- Storage usage and quota
- Counts of files, folders, shares, groups, activities, notifications
- Active subscription details (if any)

**Update user role (promote/demote):**

```bash
PUT /api/v1/admin/users/550e8400-.../role
Content-Type: application/json

{
  "role": "ADMIN"
}
```

**Roles:**
- `USER` — Standard user with normal permissions
- `ADMIN` — Administrator with full system access

**Response:**

```json
{
  "success": true,
  "message": "User role updated to ADMIN",
  "data": {
    "id": "550e8400-...",
    "email": "john@example.com",
    "username": "johndoe",
    "role": "ADMIN",
    "updatedAt": "2026-09-21T11:45:00Z"
  }
}
```

**Suspend or activate user account:**

```bash
PUT /api/v1/admin/users/550e8400-.../status
Content-Type: application/json

{
  "isActive": false
}
```

Set `isActive: false` to suspend the account (user cannot log in), `true` to reactivate.

**Response:**

```json
{
  "success": true,
  "message": "User account suspended successfully",
  "data": {
    "id": "550e8400-...",
    "email": "john@example.com",
    "username": "johndoe",
    "isActive": false,
    "updatedAt": "2026-09-21T11:50:00Z"
  }
}
```

**Update user storage quota:**

```bash
PUT /api/v1/admin/users/550e8400-.../quota
Content-Type: application/json

{
  "quotaGB": 100
}
```

**Quota limits:**
- Minimum: 0.001 GB (1 MB)
- Maximum: 10000 GB (10 TB)

**Response:**

```json
{
  "success": true,
  "message": "User storage quota updated successfully",
  "data": {
    "id": "550e8400-...",
    "email": "john@example.com",
    "username": "johndoe",
    "storageQuota": "107374182400",
    "usedStorage": "104857600",
    "quotaGB": 100,
    "updatedAt": "2026-09-21T12:00:00Z"
  }
}
```

**Delete user permanently:**

```bash
DELETE /api/v1/admin/users/550e8400-...
```

⚠️ **Warning:** This permanently deletes:
- User account
- All files and folders owned by the user
- All shares, permissions, and group memberships
- All activity logs and notifications
- All subscriptions and payment records

**Safety:** Admins cannot delete their own account.

**Response:**

```json
{
  "success": true,
  "message": "User account deleted permanently",
  "data": {
    "id": "550e8400-...",
    "email": "john@example.com",
    "username": "johndoe"
  }
}
```

#### System Statistics

**Get system-wide statistics:**

```bash
GET /api/v1/admin/stats/system
```

**Response:**

```json
{
  "success": true,
  "message": "System statistics retrieved successfully",
  "data": {
    "users": {
      "total": 1247,
      "active": 1189,
      "inactive": 58,
      "admins": 3
    },
    "content": {
      "files": 45892,
      "folders": 8734
    },
    "storage": {
      "totalUsed": "5497558138880",
      "totalUsedGB": 5120.5
    },
    "collaboration": {
      "groups": 127,
      "shares": 3456
    },
    "activities": 89234,
    "recentUsers": [
      {
        "id": "...",
        "email": "newuser@example.com",
        "username": "newuser",
        "createdAt": "2026-09-21T10:00:00Z"
      }
    ]
  }
}
```

**Get storage statistics:**

```bash
GET /api/v1/admin/stats/storage
```

Returns:
- **Top 10 users** by storage usage with percentage
- **File type distribution** (MIME type breakdown with counts and sizes)
- **Total statistics** (total files, total size, average file size)

**Response:**

```json
{
  "success": true,
  "message": "Storage statistics retrieved successfully",
  "data": {
    "topUsers": [
      {
        "id": "...",
        "email": "poweruser@example.com",
        "username": "poweruser",
        "usedStorage": "524288000000",
        "storageQuota": "549755813888",
        "usagePercentage": 95.4,
        "_count": {
          "files": 1247
        }
      }
    ],
    "fileTypes": [
      {
        "mimeType": "video/mp4",
        "count": "342",
        "totalSize": "157286400000",
        "totalSizeMB": 150000
      },
      {
        "mimeType": "image/jpeg",
        "count": "5621",
        "totalSize": "52428800000",
        "totalSizeMB": 50000
      },
      {
        "mimeType": "application/pdf",
        "count": "1892",
        "totalSize": "20971520000",
        "totalSizeMB": 20000
      }
    ],
    "totals": {
      "totalFiles": 45892,
      "totalSize": "5497558138880",
      "totalSizeGB": 5120.5,
      "averageFileSize": 119825408,
      "averageFileSizeMB": 114.3
    }
  }
}
```

**Get activity statistics:**

```bash
GET /api/v1/admin/stats/activity?days=7
```

**Query Parameters:**
- `days` (optional): Time period in days, 1-365 (default: 7)

**Response:**

```json
{
  "success": true,
  "message": "Activity statistics retrieved successfully",
  "data": {
    "period": {
      "days": 7,
      "startDate": "2026-09-14T00:00:00Z",
      "endDate": "2026-09-21T00:00:00Z"
    },
    "byAction": [
      {
        "action": "UPLOAD",
        "count": "1247"
      },
      {
        "action": "DOWNLOAD",
        "count": "892"
      },
      {
        "action": "LOGIN",
        "count": "456"
      },
      {
        "action": "SHARE",
        "count": "234"
      }
    ],
    "byDay": [
      {
        "date": "2026-09-15",
        "count": "342"
      },
      {
        "date": "2026-09-16",
        "count": "398"
      },
      {
        "date": "2026-09-17",
        "count": "287"
      }
    ],
    "topUsers": [
      {
        "user": {
          "id": "...",
          "email": "activeuser@example.com",
          "username": "activeuser"
        },
        "activityCount": 127
      }
    ]
  }
}
```

**Get recent system activities:**

```bash
GET /api/v1/admin/activities?limit=50
```

Returns recent activities from **all users** across the system (admin view).

**Query Parameters:**
- `limit` (optional): Number of activities, 1-200 (default: 50)

**Response:**

```json
{
  "success": true,
  "message": "Recent activities retrieved successfully",
  "data": [
    {
      "id": "...",
      "userId": "...",
      "action": "UPLOAD",
      "details": {
        "resourceId": "...",
        "resourceName": "report.pdf",
        "resourceType": "file"
      },
      "ipAddress": "192.168.1.100",
      "createdAt": "2026-09-21T11:30:00Z",
      "user": {
        "id": "...",
        "email": "user@example.com",
        "username": "user123"
      }
    }
  ]
}
```

#### System Maintenance

**Clean up old data:**

```bash
POST /api/v1/admin/cleanup?daysOld=30
```

Removes:
- **Trash items** older than threshold (permanently deleted)
- **Activity logs** older than threshold
- **Expired refresh tokens**

**Query Parameters:**
- `daysOld` (optional): Delete data older than this many days, 7-365 (default: 30)

**Response:**

```json
{
  "success": true,
  "message": "Old data cleaned up successfully",
  "data": {
    "deletedTrashItems": 127,
    "deletedActivities": 5432,
    "deletedExpiredTokens": 89,
    "cutoffDate": "2026-08-22T00:00:00Z"
  }
}
```

#### Admin Use Cases

**1. Monitor System Health:**
```bash
# Get overview
GET /api/v1/admin/stats/system

# Check storage usage
GET /api/v1/admin/stats/storage

# Review recent activity
GET /api/v1/admin/stats/activity?days=7
```

**2. Manage Problem Users:**
```bash
# Find inactive users
GET /api/v1/admin/users?isActive=false

# Find users over quota
GET /api/v1/admin/stats/storage
# (check topUsers with usagePercentage > 95)

# Suspend user
PUT /api/v1/admin/users/{userId}/status
{ "isActive": false }
```

**3. Promote Team Members:**
```bash
# Search for user
GET /api/v1/admin/users?search=john@company.com

# Promote to admin
PUT /api/v1/admin/users/{userId}/role
{ "role": "ADMIN" }
```

**4. Adjust Storage Plans:**
```bash
# Get user details
GET /api/v1/admin/users/{userId}

# Increase quota
PUT /api/v1/admin/users/{userId}/quota
{ "quotaGB": 1000 }
```

**5. System Maintenance:**
```bash
# Review activity trends
GET /api/v1/admin/stats/activity?days=30

# Clean up old data
POST /api/v1/admin/cleanup?daysOld=90

# Monitor recent actions
GET /api/v1/admin/activities?limit=100
```

#### Security Notes

- ✅ All admin endpoints require `ADMIN` role
- ✅ Admin middleware prevents privilege escalation
- ✅ Admins cannot delete their own accounts
- ✅ User deletions cascade properly (Prisma handles relations)
- ✅ All operations are logged in activity logs
- ⚠️ Admin access should be restricted to trusted personnel
- ⚠️ Consider implementing 2FA for admin accounts (future enhancement)
- ⚠️ Audit admin actions regularly via activity logs

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
| 13 | Search | ✅ Done |
| 14 | CLI / Command Interface | ✅ Done |
| 15 | Activity Logs + Notifications | ✅ Done |
| 16 | Admin System | ✅ Done |
| 17 | Real-Time Socket.IO | ⏳ Next |
| 18 | Payments + Storage Upgrades | ⏳ Planned |
| 19 | Security + Testing | ⏳ Planned |
| 20 | Production Deployment | ⏳ Planned |
