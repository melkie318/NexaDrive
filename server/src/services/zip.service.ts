import { ZipArchive } from 'archiver';
import unzipper from 'unzipper';
import { createReadStream, createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { FileService } from './file.service';
import { FolderService } from './folder.service';
import { QuotaService } from './storage/quota.service';
import { PermissionService } from './permission.service';

export class ZipService {
  /**
   * Compress a folder into a ZIP archive
   */
  static async compressFolder(userId: string, folderId: string): Promise<{
    zipPath: string;
    zipSize: number;
    fileName: string;
  }> {
    // Check folder exists and user has access
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: { owner: true },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    // Check permissions
    const canRead = await PermissionService.canView(userId, 'folder', folderId);
    if (!canRead) {
      throw new Error('You do not have permission to access this folder');
    }

    // Create temporary ZIP file
    const zipFileName = `${folder.name}_${Date.now()}.zip`;
    const zipPath = path.join(process.cwd(), 'uploads', 'temp', zipFileName);

    // Ensure temp directory exists
    await fs.mkdir(path.dirname(zipPath), { recursive: true });

    // Create ZIP archive
    const output = createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    return new Promise(async (resolve, reject) => {
      output.on('close', async () => {
        try {
          const stats = await fs.stat(zipPath);
          resolve({
            zipPath,
            zipSize: stats.size,
            fileName: zipFileName,
          });
        } catch (error) {
          reject(error);
        }
      });

      archive.on('error', (err: any) => {
        reject(err);
      });

      archive.pipe(output);

      // Add folder contents recursively
      await this.addFolderToArchive(archive, folderId, folder.name);

      await archive.finalize();
    });
  }

  /**
   * Compress multiple files into a ZIP archive
   */
  static async compressFiles(userId: string, fileIds: string[]): Promise<{
    zipPath: string;
    zipSize: number;
    fileName: string;
  }> {
    if (fileIds.length === 0) {
      throw new Error('No files provided for compression');
    }

    // Fetch all files and check permissions
    const files = await prisma.file.findMany({
      where: { id: { in: fileIds } },
    });

    if (files.length !== fileIds.length) {
      throw new Error('Some files were not found');
    }

    // Check permissions for all files
    for (const file of files) {
      const canRead = await PermissionService.canView(userId, 'file', file.id);
      if (!canRead) {
        throw new Error(`You do not have permission to access file: ${file.name}`);
      }
    }

    // Create temporary ZIP file
    const zipFileName = `files_${Date.now()}.zip`;
    const zipPath = path.join(process.cwd(), 'uploads', 'temp', zipFileName);

    // Ensure temp directory exists
    await fs.mkdir(path.dirname(zipPath), { recursive: true });

    // Create ZIP archive
    const output = createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    return new Promise(async (resolve, reject) => {
      output.on('close', async () => {
        try {
          const stats = await fs.stat(zipPath);
          resolve({
            zipPath,
            zipSize: stats.size,
            fileName: zipFileName,
          });
        } catch (error) {
          reject(error);
        }
      });

      archive.on('error', (err: any) => {
        reject(err);
      });

      archive.pipe(output);

      // Add each file to archive
      for (const file of files) {
        const filePath = path.join(process.cwd(), file.storagePath);
        try {
          await fs.access(filePath);
          archive.file(filePath, { name: file.name });
        } catch (error) {
          console.error(`File not found: ${filePath}`);
        }
      }

      await archive.finalize();
    });
  }

  /**
   * Extract a ZIP file into a target folder
   */
  static async extractZip(
    userId: string,
    fileId: string,
    targetFolderId?: string
  ): Promise<{
    extractedFiles: number;
    extractedFolders: number;
    totalSize: number;
  }> {
    // Check file exists and is a ZIP
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    if (file.mimeType !== 'application/zip' && !file.name.endsWith('.zip')) {
      throw new Error('File is not a ZIP archive');
    }

    // Check permissions
    const canRead = await PermissionService.canView(userId, 'file', fileId);
    if (!canRead) {
      throw new Error('You do not have permission to access this file');
    }

    // Determine target folder (use file's parent folder if not specified)
    const targetFolder = targetFolderId || file.folderId;
    if (!targetFolder) {
      throw new Error('Target folder must be specified');
    }

    // Check target folder permissions
    const canWrite = await PermissionService.canUpload(userId, 'folder', targetFolder);
    if (!canWrite) {
      throw new Error('You do not have permission to write to the target folder');
    }

    // Check quota before extraction
    const zipFilePath = path.join(process.cwd(), file.storagePath);
    const extractedSize = await this.calculateZipSize(zipFilePath);
    
    const quotaCheck = await QuotaService.check(userId, extractedSize);
    if (!quotaCheck.allowed) {
      throw new Error('Insufficient storage quota for extraction');
    }

    // Extract ZIP
    let extractedFiles = 0;
    let extractedFolders = 0;
    let totalSize = 0;

    const folderMap = new Map<string, string>(); // path -> folderId mapping
    folderMap.set('', targetFolder);

    return new Promise(async (resolve, reject) => {
      try {
        const stream = createReadStream(zipFilePath);
        const directory = await unzipper.Open.file(zipFilePath);

        for (const entry of directory.files) {
          const entryPath = entry.path;
          const isDirectory = entry.type === 'Directory';

          // Parse path components
          const pathParts = entryPath.split('/').filter(p => p);
          
          if (isDirectory) {
            // Create folder structure
            let currentParentId = targetFolder;
            let currentPath = '';

            for (const part of pathParts) {
              currentPath = currentPath ? `${currentPath}/${part}` : part;
              
              if (!folderMap.has(currentPath)) {
                const newFolder = await FolderService.createFolder(userId, {
                  name: part,
                  parentId: currentParentId,
                  visibility: 'PRIVATE',
                });
                folderMap.set(currentPath, newFolder.id);
                currentParentId = newFolder.id;
                extractedFolders++;
              } else {
                currentParentId = folderMap.get(currentPath)!;
              }
            }
          } else {
            // Extract file
            const fileName = pathParts[pathParts.length - 1];
            const folderPath = pathParts.slice(0, -1).join('/');
            const parentFolderId = folderMap.get(folderPath) || targetFolder;

            // Create temporary file
            const tempFileName = `extract_${Date.now()}_${fileName}`;
            const tempPath = path.join(process.cwd(), 'uploads', 'temp', tempFileName);
            await fs.mkdir(path.dirname(tempPath), { recursive: true });

            // Extract entry to temp file
            const buffer = await entry.buffer();
            await fs.writeFile(tempPath, buffer);

            // Get file stats
            const stats = await fs.stat(tempPath);
            const fileSize = stats.size;
            totalSize += fileSize;

            // Create file record (mimicking upload)
            const relativePath = path.join('uploads', 'temp', tempFileName);
            const mimeType = this.getMimeType(fileName);

            await prisma.file.create({
              data: {
                name: fileName,
                storagePath: relativePath,
                size: fileSize,
                mimeType,
                ownerId: userId,
                folderId: parentFolderId,
              },
            });

            // Increment quota
            await QuotaService.increment(userId, fileSize);
            extractedFiles++;
          }
        }

        resolve({
          extractedFiles,
          extractedFolders,
          totalSize,
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Helper: Add folder contents to archive recursively
   */
  private static async addFolderToArchive(
    archive: ZipArchive,
    folderId: string,
    basePath: string
  ): Promise<void> {
    // Get folder contents
    const files = await prisma.file.findMany({
      where: { folderId },
    });

    const subfolders = await prisma.folder.findMany({
      where: { parentId: folderId },
    });

    // Add files
    for (const file of files) {
      const filePath = path.join(process.cwd(), file.storagePath);
      try {
        await fs.access(filePath);
        archive.file(filePath, { name: `${basePath}/${file.name}` });
      } catch (error) {
        console.error(`File not found: ${filePath}`);
      }
    }

    // Add subfolders recursively
    for (const subfolder of subfolders) {
      const subPath = `${basePath}/${subfolder.name}`;
      await this.addFolderToArchive(archive, subfolder.id, subPath);
    }
  }

  /**
   * Helper: Calculate total uncompressed size of ZIP
   */
  private static async calculateZipSize(zipPath: string): Promise<number> {
    try {
      const directory = await unzipper.Open.file(zipPath);
      let totalSize = 0;
      
      for (const entry of directory.files) {
        if (entry.type !== 'Directory') {
          totalSize += entry.uncompressedSize;
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Error calculating ZIP size:', error);
      return 0;
    }
  }

  /**
   * Helper: Get MIME type from file extension
   */
  private static getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.zip': 'application/zip',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Clean up temporary ZIP files
   */
  static async cleanupTempZip(zipPath: string): Promise<void> {
    try {
      await fs.unlink(zipPath);
    } catch (error) {
      console.error('Error cleaning up temp ZIP:', error);
    }
  }
}
