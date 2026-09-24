import chalk from 'chalk';
/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0)
        return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(2)} ${sizes[i]}`;
}
/**
 * Format date in readable format
 */
export function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleString();
}
/**
 * Format success message
 */
export function success(message) {
    console.log(chalk.green('✓'), message);
}
/**
 * Format error message
 */
export function error(message) {
    console.log(chalk.red('✗'), message);
}
/**
 * Format info message
 */
export function info(message) {
    console.log(chalk.blue('ℹ'), message);
}
/**
 * Format warning message
 */
export function warning(message) {
    console.log(chalk.yellow('⚠'), message);
}
/**
 * Format table header
 */
export function tableHeader(columns) {
    console.log(chalk.bold(columns.join(' | ')));
    console.log(columns.map(col => '-'.repeat(col.length)).join('-+-'));
}
/**
 * Format table row
 */
export function tableRow(values) {
    console.log(values.join(' | '));
}
