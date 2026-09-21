import multer from 'multer';
import path from 'path';
import os from 'os';
import { Request } from 'express';
import { config } from '../config/env';

/**
 * Multer is configured to write uploaded files to the OS temp directory.
 * The file service then moves each file to its permanent user-scoped location
 * after all validation (quota, folder ownership) passes.
 *
 * This two-step approach keeps the uploads directory clean: if any check
 * fails the temp file is deleted and nothing ends up in uploads/.
 */
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    // Preserve the original extension so MIME sniffing works if needed
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    cb(null, `nexadrive-${uniqueSuffix}${ext}`);
  },
});

/**
 * Allowed MIME type prefixes and explicit types.
 * Extend this list as new media categories are supported.
 */
const ALLOWED_MIME_PREFIXES = [
  'image/',
  'video/',
  'audio/',
  'text/',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-',
  'application/zip',
  'application/x-zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'application/json',
  'application/xml',
  'application/x-tar',
  'application/gzip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
];

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  const mime = file.mimetype.toLowerCase();
  const allowed = ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));

  if (allowed) {
    cb(null, true);
  } else {
    cb(new Error(`File type "${file.mimetype}" is not allowed`));
  }
}

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.storage.maxFileSizeBytes, // default 5 GB from .env
    files: 1,
  },
}).single('file'); // field name expected in multipart/form-data
