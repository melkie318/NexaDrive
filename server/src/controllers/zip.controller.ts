import { Request, Response } from 'express';
import { ZipService } from '../services/zip.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import {
  compressFolderSchema,
  compressFilesSchema,
  extractZipSchema,
} from '../validations/zip.validation';

export class ZipController {
  /**
   * Compress a folder into a ZIP archive and download
   * POST /api/v1/zip/folder
   */
  static compressFolder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validated = compressFolderSchema.parse(req.body);

    const result = await ZipService.compressFolder(userId, validated.folderId);

    // Stream the ZIP file for download
    res.download(result.zipPath, result.fileName, async (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up temp file after download
      await ZipService.cleanupTempZip(result.zipPath);
    });
  });

  /**
   * Compress multiple files into a ZIP archive and download
   * POST /api/v1/zip/files
   */
  static compressFiles = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validated = compressFilesSchema.parse(req.body);

    const result = await ZipService.compressFiles(userId, validated.fileIds);

    // Stream the ZIP file for download
    res.download(result.zipPath, result.fileName, async (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up temp file after download
      await ZipService.cleanupTempZip(result.zipPath);
    });
  });

  /**
   * Extract a ZIP file into a target folder
   * POST /api/v1/zip/extract
   */
  static extractZip = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validated = extractZipSchema.parse(req.body);

    const result = await ZipService.extractZip(
      userId,
      validated.fileId,
      validated.targetFolderId
    );

    sendResponse(res, {
      statusCode: 200,
      message: 'ZIP file extracted successfully',
      data: result,
    });
  });
}
