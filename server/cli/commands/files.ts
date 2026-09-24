import { Command } from 'commander';
import ora from 'ora';
import path from 'path';
import { uploadFile, downloadFile, apiRequest } from '../utils/api';
import { success, error, info, tableHeader, tableRow, formatFileSize, formatDate } from '../utils/format';
import { isAuthenticated } from '../utils/config';

export function createFileCommands(program: Command): void {
  const files = program.command('files').description('File operations');

  /**
   * Upload file command
   */
  files
    .command('upload <file>')
    .description('Upload a file to NexaDrive')
    .option('-f, --folder <folderId>', 'Upload to specific folder')
    .action(async (file: string, options) => {
      if (!isAuthenticated()) {
        error('Not authenticated. Please login first.');
        return;
      }

      try {
        const spinner = ora('Uploading file...').start();
        
        const response = await uploadFile(file, options.folder);
        
        spinner.stop();
        
        if (response.success) {
          success(`File uploaded successfully: ${response.data.name}`);
          info(`File ID: ${response.data.id}`);
          info(`Size: ${formatFileSize(parseInt(response.data.size))}`);
        }
      } catch (err: any) {
        error(err.response?.data?.message || err.message || 'Upload failed');
      }
    });

  /**
   * Download file command
   */
  files
    .command('download <fileId>')
    .description('Download a file from NexaDrive')
    .option('-o, --output <path>', 'Output file path')
    .action(async (fileId: string, options) => {
      if (!isAuthenticated()) {
        error('Not authenticated. Please login first.');
        return;
      }

      try {
        // Get file metadata first
        const spinner = ora('Fetching file info...').start();
        const fileInfo = await apiRequest('GET', `/files/${fileId}`);
        
        if (!fileInfo.success) {
          spinner.stop();
          error('File not found');
          return;
        }

        const fileName = fileInfo.data.name;
        const outputPath = options.output || path.join(process.cwd(), fileName);
        
        spinner.text = 'Downloading file...';
        
        await downloadFile(fileId, outputPath);
        
        spinner.stop();
        success(`File downloaded: ${outputPath}`);
      } catch (err: any) {
        error(err.response?.data?.message || err.message || 'Download failed');
      }
    });

  /**
   * List files command
   */
  files
    .command('list')
    .description('List files')
    .option('-f, --folder <folderId>', 'List files in specific folder')
    .option('-p, --page <number>', 'Page number', '1')
    .option('-l, --limit <number>', 'Items per page', '20')
    .action(async (options) => {
      if (!isAuthenticated()) {
        error('Not authenticated. Please login first.');
        return;
      }

      try {
        const spinner = ora('Fetching files...').start();
        
        const params: any = {
          page: options.page,
          limit: options.limit,
        };
        
        if (options.folder) {
          params.folderId = options.folder;
        }

        const response = await apiRequest('GET', '/files', null, { params });
        
        spinner.stop();

        if (response.success && response.data.length > 0) {
          console.log('\nFiles:');
          console.log();
          
          tableHeader(['Name', 'Size', 'Type', 'Created', 'ID']);
          
          response.data.forEach((file: any) => {
            tableRow([
              file.name.substring(0, 30),
              formatFileSize(parseInt(file.size)),
              file.mimeType.substring(0, 20),
              formatDate(file.createdAt).substring(0, 16),
              file.id.substring(0, 8) + '...',
            ]);
          });
          
          console.log();
          info(`Page ${response.meta.page} of ${response.meta.totalPages} (${response.meta.total} total)`);
        } else {
          info('No files found');
        }
      } catch (err: any) {
        error(err.response?.data?.message || err.message || 'Failed to list files');
      }
    });

  /**
   * Delete file command
   */
  files
    .command('delete <fileId>')
    .description('Delete a file')
    .action(async (fileId: string) => {
      if (!isAuthenticated()) {
        error('Not authenticated. Please login first.');
        return;
      }

      try {
        const spinner = ora('Deleting file...').start();
        
        const response = await apiRequest('DELETE', `/files/${fileId}`);
        
        spinner.stop();
        
        if (response.success) {
          success('File moved to trash');
        }
      } catch (err: any) {
        error(err.response?.data?.message || err.message || 'Delete failed');
      }
    });

  /**
   * Search files command
   */
  files
    .command('search <query>')
    .description('Search files by name')
    .option('-t, --type <mimeType>', 'Filter by MIME type')
    .option('--min-size <bytes>', 'Minimum file size')
    .option('--max-size <bytes>', 'Maximum file size')
    .option('-p, --page <number>', 'Page number', '1')
    .option('-l, --limit <number>', 'Items per page', '20')
    .action(async (query: string, options) => {
      if (!isAuthenticated()) {
        error('Not authenticated. Please login first.');
        return;
      }

      try {
        const spinner = ora('Searching files...').start();
        
        const params: any = {
          query,
          page: options.page,
          limit: options.limit,
        };
        
        if (options.type) params.mimeType = options.type;
        if (options.minSize) params.minSize = options.minSize;
        if (options.maxSize) params.maxSize = options.maxSize;

        const response = await apiRequest('GET', '/search/files', null, { params });
        
        spinner.stop();

        if (response.success && response.data.length > 0) {
          console.log('\nSearch Results:');
          console.log();
          
          tableHeader(['Name', 'Size', 'Type', 'Created', 'ID']);
          
          response.data.forEach((file: any) => {
            tableRow([
              file.name.substring(0, 30),
              formatFileSize(parseInt(file.size)),
              file.mimeType.substring(0, 20),
              formatDate(file.createdAt).substring(0, 16),
              file.id.substring(0, 8) + '...',
            ]);
          });
          
          console.log();
          info(`Found ${response.meta.total} files (page ${response.meta.page} of ${response.meta.totalPages})`);
        } else {
          info('No files found');
        }
      } catch (err: any) {
        error(err.response?.data?.message || err.message || 'Search failed');
      }
    });

  /**
   * File info command
   */
  files
    .command('info <fileId>')
    .description('Show file details')
    .action(async (fileId: string) => {
      if (!isAuthenticated()) {
        error('Not authenticated. Please login first.');
        return;
      }

      try {
        const spinner = ora('Fetching file info...').start();
        
        const response = await apiRequest('GET', `/files/${fileId}`);
        
        spinner.stop();

        if (response.success) {
          const file = response.data;
          console.log('\nFile Information:');
          console.log('  Name:', file.name);
          console.log('  ID:', file.id);
          console.log('  Size:', formatFileSize(parseInt(file.size)));
          console.log('  MIME Type:', file.mimeType);
          console.log('  Visibility:', file.visibility);
          console.log('  Version:', file.currentVer);
          console.log('  Created:', formatDate(file.createdAt));
          console.log('  Updated:', formatDate(file.updatedAt));
          console.log('  Owner ID:', file.ownerId);
          if (file.folderId) {
            console.log('  Folder ID:', file.folderId);
          }
          console.log();
        }
      } catch (err: any) {
        error(err.response?.data?.message || err.message || 'Failed to get file info');
      }
    });
}
