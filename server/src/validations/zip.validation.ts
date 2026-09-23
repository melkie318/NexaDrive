import { z } from 'zod';

/**
 * Validation schema for compressing a folder
 */
export const compressFolderSchema = z.object({
  folderId: z.string().uuid('Invalid folder ID format'),
});

/**
 * Validation schema for compressing multiple files
 */
export const compressFilesSchema = z.object({
  fileIds: z
    .array(z.string().uuid('Invalid file ID format'))
    .min(1, 'At least one file ID is required')
    .max(100, 'Cannot compress more than 100 files at once'),
});

/**
 * Validation schema for extracting a ZIP file
 */
export const extractZipSchema = z.object({
  fileId: z.string().uuid('Invalid file ID format'),
  targetFolderId: z.string().uuid('Invalid target folder ID format').optional(),
});
