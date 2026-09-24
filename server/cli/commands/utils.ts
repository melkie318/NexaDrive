import { Command } from 'commander';
import ora from 'ora';
import { apiRequest } from '../utils/api';
import { success, error, info, tableHeader, tableRow, formatFileSize, formatDate } from '../utils/format';
import { isAuthenticated } from '../utils/config';

export function createUtilityCommands(program: Command): void {
  /**
   * Quota command
   */
  program
    .command('quota')
    .description('Show storage quota information')
    .action(async () => {
      if (!isAuthenticated()) {
        error('Not authenticated. Please login first.');
        return;
      }

      try {
        const spinner = ora('Fetching quota info...').start();
        
        const response = await apiRequest('GET', '/storage/quota');
        
        spinner.stop();

        if (response.success) {
          const data = response.data;
          console.log('\nStorage Quota:');
          console.log('  Used:', formatFileSize(parseInt(data.usedBytes)));
          console.log('  Total:', formatFileSize(parseInt(data.totalBytes)));
          console.log('  Available:', formatFileSize(parseInt(data.availableBytes)));
          console.log('  Usage:', `${data.usagePercent.toFixed(2)}%`);
          
          if (data.isNearFull) {
            console.log('  Status:', '⚠️  Near full');
          } else if (data.isFull) {
            console.log('  Status:', '🔴 Full');
          } else {
            console.log('  Status:', '✅ OK');
          }
          
          console.log('\nCounts:');
          console.log('  Files:', data.fileCount);
          console.log('  Folders:', data.folderCount);
          console.log('  Trashed Items:', data.trashedCount);
          console.log();
        }
      } catch (err: any) {
        error(err.response?.data?.message || err.message || 'Failed to get quota info');
      }
    });

  /**
   * Recent files command
   */
  program
    .command('recent')
    .description('Show recently modified files')
    .option('-l, --limit <number>', 'Number of files to show', '10')
    .action(async (options) => {
      if (!isAuthenticated()) {
        error('Not authenticated. Please login first.');
        return;
      }

      try {
        const spinner = ora('Fetching recent files...').start();
        
        const response = await apiRequest('GET', '/search/recent', null, {
          params: { limit: options.limit },
        });
        
        spinner.stop();

        if (response.success && response.data.length > 0) {
          console.log('\nRecent Files:');
          console.log();
          
          tableHeader(['Name', 'Size', 'Type', 'Modified', 'ID']);
          
          response.data.forEach((file: any) => {
            tableRow([
              file.name.substring(0, 30),
              formatFileSize(parseInt(file.size)),
              file.mimeType.substring(0, 20),
              formatDate(file.updatedAt).substring(0, 16),
              file.id.substring(0, 8) + '...',
            ]);
          });
          
          console.log();
        } else {
          info('No recent files found');
        }
      } catch (err: any) {
        error(err.response?.data?.message || err.message || 'Failed to get recent files');
      }
    });

  /**
   * Large files command
   */
  program
    .command('large')
    .description('Show largest files')
    .option('--min-size <bytes>', 'Minimum file size', '10485760')
    .option('-l, --limit <number>', 'Number of files to show', '10')
    .action(async (options) => {
      if (!isAuthenticated()) {
        error('Not authenticated. Please login first.');
        return;
      }

      try {
        const spinner = ora('Fetching large files...').start();
        
        const response = await apiRequest('GET', '/search/large', null, {
          params: {
            minSize: options.minSize,
            limit: options.limit,
          },
        });
        
        spinner.stop();

        if (response.success && response.data.length > 0) {
          console.log('\nLarge Files:');
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
          info(`Showing files larger than ${formatFileSize(parseInt(options.minSize))}`);
        } else {
          info('No large files found');
        }
      } catch (err: any) {
        error(err.response?.data?.message || err.message || 'Failed to get large files');
      }
    });

  /**
   * Trash command
   */
  program
    .command('trash')
    .description('List items in trash')
    .option('-p, --page <number>', 'Page number', '1')
    .option('-l, --limit <number>', 'Items per page', '20')
    .action(async (options) => {
      if (!isAuthenticated()) {
        error('Not authenticated. Please login first.');
        return;
      }

      try {
        const spinner = ora('Fetching trash items...').start();
        
        const response = await apiRequest('GET', '/trash', null, {
          params: {
            page: options.page,
            limit: options.limit,
          },
        });
        
        spinner.stop();

        if (response.success && response.data.length > 0) {
          console.log('\nTrash Items:');
          console.log();
          
          tableHeader(['Name', 'Type', 'Deleted', 'Expires', 'ID']);
          
          response.data.forEach((item: any) => {
            const name = item.resource?.name || item.originalPath || 'Unknown';
            tableRow([
              name.substring(0, 25),
              item.type,
              formatDate(item.deletedAt).substring(0, 16),
              formatDate(item.expiresAt).substring(0, 16),
              item.id.substring(0, 8) + '...',
            ]);
          });
          
          console.log();
          info(`Page ${response.meta.page} of ${response.meta.totalPages} (${response.meta.total} total)`);
        } else {
          info('Trash is empty');
        }
      } catch (err: any) {
        error(err.response?.data?.message || err.message || 'Failed to list trash');
      }
    });

  /**
   * Search command (global)
   */
  program
    .command('search <query>')
    .description('Global search (files and folders)')
    .option('-p, --page <number>', 'Page number', '1')
    .option('-l, --limit <number>', 'Items per page', '20')
    .action(async (query: string, options) => {
      if (!isAuthenticated()) {
        error('Not authenticated. Please login first.');
        return;
      }

      try {
        const spinner = ora('Searching...').start();
        
        const response = await apiRequest('GET', '/search', null, {
          params: {
            query,
            page: options.page,
            limit: options.limit,
          },
        });
        
        spinner.stop();

        if (response.success) {
          const { files, folders, totalResults } = response.data;
          
          if (files.results.length > 0) {
            console.log('\nFiles:');
            console.log();
            tableHeader(['Name', 'Size', 'Type', 'ID']);
            
            files.results.forEach((file: any) => {
              tableRow([
                file.name.substring(0, 35),
                formatFileSize(parseInt(file.size)),
                file.mimeType.substring(0, 20),
                file.id.substring(0, 8) + '...',
              ]);
            });
            console.log();
          }
          
          if (folders.results.length > 0) {
            console.log('\nFolders:');
            console.log();
            tableHeader(['Name', 'Visibility', 'ID']);
            
            folders.results.forEach((folder: any) => {
              tableRow([
                folder.name.substring(0, 40),
                folder.visibility,
                folder.id.substring(0, 8) + '...',
              ]);
            });
            console.log();
          }
          
          info(`Found ${totalResults} total results (${files.total} files, ${folders.total} folders)`);
        }
      } catch (err: any) {
        error(err.response?.data?.message || err.message || 'Search failed');
      }
    });
}
