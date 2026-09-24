import { z } from 'zod';

/**
 * Validation schema for file search
 */
export const searchFilesSchema = z.object({
  query: z.string().min(1).max(255).optional(),
  mimeType: z.string().max(100).optional(),
  minSize: z.coerce.number().int().min(0).optional(),
  maxSize: z.coerce.number().int().min(0).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  folderId: z.string().uuid('Invalid folder ID format').optional(),
  includeSubfolders: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Validation schema for folder search
 */
export const searchFoldersSchema = z.object({
  query: z.string().min(1).max(255).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  folderId: z.string().uuid('Invalid folder ID format').optional(),
  includeSubfolders: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Validation schema for global search
 */
export const globalSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(255),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Validation schema for search by type
 */
export const searchByTypeSchema = z.object({
  category: z.enum(['image', 'video', 'audio', 'document', 'archive']),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Validation schema for recent files
 */
export const searchRecentSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Validation schema for large files
 */
export const searchLargeFilesSchema = z.object({
  minSize: z.coerce.number().int().min(0).optional().default(10485760), // 10 MB
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
