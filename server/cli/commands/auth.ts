import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { saveConfig, clearConfig, loadConfig } from '../utils/config';
import { apiRequest } from '../utils/api';
import { success, error, info } from '../utils/format';

export function createAuthCommands(program: Command): void {
  const auth = program.command('auth').description('Authentication commands');

  /**
   * Login command
   */
  auth
    .command('login')
    .description('Login to NexaDrive')
    .action(async () => {
      try {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'email',
            message: 'Email:',
            validate: (input) => input.length > 0 || 'Email is required',
          },
          {
            type: 'password',
            name: 'password',
            message: 'Password:',
            mask: '*',
            validate: (input) => input.length > 0 || 'Password is required',
          },
        ]);

        const spinner = ora('Logging in...').start();

        const response = await apiRequest('POST', '/auth/login', {
          email: answers.email,
          password: answers.password,
        });

        spinner.stop();

        if (response.success) {
          const { accessToken, refreshToken, user } = response.data;
          
          saveConfig({
            accessToken,
            refreshToken,
            user: {
              id: user.id,
              email: user.email,
              username: user.username,
            },
          });

          success(`Logged in as ${user.email}`);
        } else {
          error('Login failed');
        }
      } catch (err: any) {
        error(err.response?.data?.message || err.message || 'Login failed');
      }
    });

  /**
   * Register command
   */
  auth
    .command('register')
    .description('Register a new account')
    .action(async () => {
      try {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'email',
            message: 'Email:',
            validate: (input) => input.includes('@') || 'Valid email is required',
          },
          {
            type: 'input',
            name: 'username',
            message: 'Username:',
            validate: (input) => input.length >= 3 || 'Username must be at least 3 characters',
          },
          {
            type: 'password',
            name: 'password',
            message: 'Password:',
            mask: '*',
            validate: (input) => input.length >= 6 || 'Password must be at least 6 characters',
          },
          {
            type: 'password',
            name: 'confirmPassword',
            message: 'Confirm Password:',
            mask: '*',
            validate: (input: string, answers?: any) => 
              input === answers?.password || 'Passwords do not match',
          },
        ]);

        const spinner = ora('Creating account...').start();

        const response = await apiRequest('POST', '/auth/register', {
          email: answers.email,
          username: answers.username,
          password: answers.password,
        });

        spinner.stop();

        if (response.success) {
          success('Account created successfully!');
          info('Please login with your credentials');
        } else {
          error('Registration failed');
        }
      } catch (err: any) {
        error(err.response?.data?.message || err.message || 'Registration failed');
      }
    });

  /**
   * Logout command
   */
  auth
    .command('logout')
    .description('Logout from NexaDrive')
    .action(() => {
      try {
        clearConfig();
        success('Logged out successfully');
      } catch (err: any) {
        error('Logout failed: ' + err.message);
      }
    });

  /**
   * Whoami command
   */
  auth
    .command('whoami')
    .description('Show current user information')
    .action(() => {
      const config = loadConfig();
      
      if (!config.user || !config.accessToken) {
        info('Not logged in');
        return;
      }

      console.log('\nCurrent User:');
      console.log('  Email:', config.user.email);
      console.log('  Username:', config.user.username);
      console.log('  User ID:', config.user.id);
      console.log('  API URL:', config.apiUrl);
      console.log();
    });
}
