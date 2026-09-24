import ora from 'ora';
import { apiRequest } from '../utils/api';
import { success, error, info, tableHeader, tableRow, formatDate } from '../utils/format';
import { isAuthenticated } from '../utils/config';
export function createFolderCommands(program) {
    const folders = program.command('folders').description('Folder operations');
    /**
     * Create folder command
     */
    folders
        .command('create <name>')
        .description('Create a new folder')
        .option('-p, --parent <folderId>', 'Parent folder ID')
        .option('-v, --visibility <type>', 'Visibility: PRIVATE, SHARED, PUBLIC', 'PRIVATE')
        .action(async (name, options) => {
        if (!isAuthenticated()) {
            error('Not authenticated. Please login first.');
            return;
        }
        try {
            const spinner = ora('Creating folder...').start();
            const response = await apiRequest('POST', '/folders', {
                name,
                parentId: options.parent,
                visibility: options.visibility,
            });
            spinner.stop();
            if (response.success) {
                success(`Folder created: ${response.data.name}`);
                info(`Folder ID: ${response.data.id}`);
            }
        }
        catch (err) {
            error(err.response?.data?.message || err.message || 'Failed to create folder');
        }
    });
    /**
     * List folders command
     */
    folders
        .command('list')
        .description('List folders')
        .option('-p, --parent <folderId>', 'List folders in specific parent')
        .option('--page <number>', 'Page number', '1')
        .option('-l, --limit <number>', 'Items per page', '20')
        .action(async (options) => {
        if (!isAuthenticated()) {
            error('Not authenticated. Please login first.');
            return;
        }
        try {
            const spinner = ora('Fetching folders...').start();
            const params = {
                page: options.page,
                limit: options.limit,
            };
            if (options.parent) {
                params.parentId = options.parent;
            }
            const response = await apiRequest('GET', '/folders', null, { params });
            spinner.stop();
            if (response.success && response.data.length > 0) {
                console.log('\nFolders:');
                console.log();
                tableHeader(['Name', 'Visibility', 'Created', 'ID']);
                response.data.forEach((folder) => {
                    tableRow([
                        folder.name.substring(0, 35),
                        folder.visibility,
                        formatDate(folder.createdAt).substring(0, 16),
                        folder.id.substring(0, 8) + '...',
                    ]);
                });
                console.log();
                info(`Page ${response.meta.page} of ${response.meta.totalPages} (${response.meta.total} total)`);
            }
            else {
                info('No folders found');
            }
        }
        catch (err) {
            error(err.response?.data?.message || err.message || 'Failed to list folders');
        }
    });
    /**
     * Folder info command
     */
    folders
        .command('info <folderId>')
        .description('Show folder details')
        .action(async (folderId) => {
        if (!isAuthenticated()) {
            error('Not authenticated. Please login first.');
            return;
        }
        try {
            const spinner = ora('Fetching folder info...').start();
            const response = await apiRequest('GET', `/folders/${folderId}`);
            spinner.stop();
            if (response.success) {
                const folder = response.data;
                console.log('\nFolder Information:');
                console.log('  Name:', folder.name);
                console.log('  ID:', folder.id);
                console.log('  Visibility:', folder.visibility);
                console.log('  Created:', formatDate(folder.createdAt));
                console.log('  Updated:', formatDate(folder.updatedAt));
                console.log('  Owner ID:', folder.ownerId);
                if (folder.parentId) {
                    console.log('  Parent ID:', folder.parentId);
                }
                if (folder.subfolders && folder.subfolders.length > 0) {
                    console.log('\n  Subfolders:', folder.subfolders.length);
                    folder.subfolders.forEach((sub) => {
                        console.log(`    - ${sub.name} (${sub.id.substring(0, 8)}...)`);
                    });
                }
                if (folder.breadcrumb && folder.breadcrumb.length > 0) {
                    console.log('\n  Path:');
                    const path = folder.breadcrumb.map((b) => b.name).join(' / ');
                    console.log(`    ${path}`);
                }
                console.log();
            }
        }
        catch (err) {
            error(err.response?.data?.message || err.message || 'Failed to get folder info');
        }
    });
    /**
     * Delete folder command
     */
    folders
        .command('delete <folderId>')
        .description('Delete a folder')
        .action(async (folderId) => {
        if (!isAuthenticated()) {
            error('Not authenticated. Please login first.');
            return;
        }
        try {
            const spinner = ora('Deleting folder...').start();
            const response = await apiRequest('DELETE', `/folders/${folderId}`);
            spinner.stop();
            if (response.success) {
                success('Folder moved to trash');
            }
        }
        catch (err) {
            error(err.response?.data?.message || err.message || 'Delete failed');
        }
    });
    /**
     * Rename folder command
     */
    folders
        .command('rename <folderId> <newName>')
        .description('Rename a folder')
        .action(async (folderId, newName) => {
        if (!isAuthenticated()) {
            error('Not authenticated. Please login first.');
            return;
        }
        try {
            const spinner = ora('Renaming folder...').start();
            const response = await apiRequest('PATCH', `/folders/${folderId}`, {
                name: newName,
            });
            spinner.stop();
            if (response.success) {
                success(`Folder renamed to: ${response.data.name}`);
            }
        }
        catch (err) {
            error(err.response?.data?.message || err.message || 'Rename failed');
        }
    });
}
