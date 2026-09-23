import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { VersionService } from '../services/version.service';

/**
 * @swagger
 * tags:
 *   name: Versions
 *   description: File version history and management
 */

export class VersionController {
  /**
   * @swagger
   * /api/v1/files/{fileId}/versions:
   *   get:
   *     summary: List all versions for a file
   *     tags: [Versions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: fileId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *         description: Maximum number of versions to return
   *     responses:
   *       200:
   *         description: Versions retrieved successfully
   */
  static listVersions = asyncHandler(async (req: Request, res: Response) => {
    const fileId = req.params.fileId as string;
    const versions = await VersionService.listVersions(req.user!.id, fileId);

    return sendResponse(res, {
      statusCode: 200,
      message: 'File versions retrieved successfully',
      data: {
        versions,
        maxVersions: VersionService.getMaxVersions(),
        count: versions.length,
      },
    });
  });

  /**
   * @swagger
   * /api/v1/files/versions/{versionId}:
   *   get:
   *     summary: Get details of a specific version
   *     tags: [Versions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: versionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Version details retrieved successfully
   */
  static getVersion = asyncHandler(async (req: Request, res: Response) => {
    const versionId = req.params.versionId as string;
    const version = await VersionService.getVersion(req.user!.id, versionId);

    return sendResponse(res, {
      statusCode: 200,
      message: 'Version retrieved successfully',
      data: version,
    });
  });

  /**
   * @swagger
   * /api/v1/files/versions/{versionId}/restore:
   *   post:
   *     summary: Restore a file to a specific version
   *     tags: [Versions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: versionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: File restored to version successfully
   */
  static restoreVersion = asyncHandler(async (req: Request, res: Response) => {
    const versionId = req.params.versionId as string;
    const result = await VersionService.restoreVersion(req.user!.id, versionId);

    return sendResponse(res, {
      statusCode: 200,
      message: 'File restored to version successfully',
      data: result,
    });
  });

  /**
   * @swagger
   * /api/v1/files/versions/{versionId}/download:
   *   get:
   *     summary: Download a specific version of a file
   *     tags: [Versions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: versionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Version file stream
   */
  static downloadVersion = asyncHandler(async (req: Request, res: Response) => {
    const versionId = req.params.versionId as string;
    const storagePath = await VersionService.getVersionDownloadPath(req.user!.id, versionId);

    // Get version details for filename
    const version = await VersionService.getVersion(req.user!.id, versionId);

    // Stream the file
    const fs = await import('fs');
    const path = await import('path');
    
    const filename = version.file?.name || 'download';
    const versionFilename = `${path.basename(filename, path.extname(filename))}_v${version.versionNum}${path.extname(filename)}`;

    res.setHeader('Content-Disposition', `attachment; filename="${versionFilename}"`);
    res.setHeader('Content-Type', version.file?.mimeType || 'application/octet-stream');

    const fileStream = fs.createReadStream(storagePath);
    fileStream.pipe(res);
  });

  /**
   * @swagger
   * /api/v1/files/versions/{versionId}:
   *   delete:
   *     summary: Delete a specific version
   *     tags: [Versions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: versionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Version deleted successfully
   */
  static deleteVersion = asyncHandler(async (req: Request, res: Response) => {
    const versionId = req.params.versionId as string;
    const result = await VersionService.deleteVersion(req.user!.id, versionId);

    return sendResponse(res, {
      statusCode: 200,
      message: 'Version deleted successfully',
      data: result,
    });
  });

  /**
   * @swagger
   * /api/v1/files/{fileId}/versions:
   *   delete:
   *     summary: Delete all versions for a file
   *     tags: [Versions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: fileId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: All versions deleted successfully
   */
  static deleteAllVersions = asyncHandler(async (req: Request, res: Response) => {
    const fileId = req.params.fileId as string;
    const result = await VersionService.deleteAllVersions(req.user!.id, fileId);

    return sendResponse(res, {
      statusCode: 200,
      message: 'All versions deleted successfully',
      data: result,
    });
  });
}
