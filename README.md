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
│   │   └── user.controller.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts  # JWT authentication + role guard
│   │   ├── errorHandler.ts     # Global error handler + AppError
│   │   ├── notFound.ts
│   │   └── upload.middleware.ts # Multer configuration
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── file.routes.ts
│   │   ├── folder.routes.ts
│   │   ├── health.routes.ts
│   │   └── user.routes.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── file.service.ts
│   │   ├── folder.service.ts
│   │   └── user.service.ts
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
│   │   └── user.validation.ts
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
| 7 | Storage Quota + Storage Engine | ⏳ Next |
| 8 | Authorization + Permission Engine | ⏳ Planned |
| 9 | Sharing + Groups + Invitations | ⏳ Planned |
| 10 | Trash + Recovery | ⏳ Planned |
| 11 | File Versioning | ⏳ Planned |
| 12 | ZIP Compression + Extraction | ⏳ Planned |
| 13 | Search | ⏳ Planned |
| 14 | CLI / Command Interface | ⏳ Planned |
| 15 | Activity Logs + Notifications | ⏳ Planned |
| 16 | Admin System | ⏳ Planned |
| 17 | Real-Time Socket.IO | ⏳ Planned |
| 18 | Payments + Storage Upgrades | ⏳ Planned |
| 19 | Security + Testing | ⏳ Planned |
| 20 | Production Deployment | ⏳ Planned |
