#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createAuthCommands } from './commands/auth';
import { createFileCommands } from './commands/files';
import { createFolderCommands } from './commands/folders';
import { createUtilityCommands } from './commands/utils';

const program = new Command();

program
  .name('nexadrive')
  .description('NexaDrive CLI - Command-line interface for file management')
  .version('1.0.0');

// ASCII Art Banner
console.log(chalk.cyan(`
╔═╗  ╦╔═╗═╗ ╦╔═╗╔╦╗╦═╗╦╦  ╦╔═╗
║║║  ║╠═ ╔╩╦╝╠═╣ ║║╠╦╝║╚╗╔╝║╣ 
╝╚╝  ╩╚═╝╩ ╚═╩ ╩═╩╝╩╚═╩ ╚╝ ╚═╝
                       CLI v1.0.0
`));

// Register command groups
createAuthCommands(program);
createFileCommands(program);
createFolderCommands(program);
createUtilityCommands(program);

// Parse command-line arguments
program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
