import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.nexadrive');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface Config {
  apiUrl: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

const DEFAULT_CONFIG: Config = {
  apiUrl: 'http://localhost:5000/api/v1',
};

/**
 * Ensure config directory exists
 */
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load configuration from file
 */
export function loadConfig(): Config {
  ensureConfigDir();
  
  if (!fs.existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch (error) {
    console.error('Error reading config file:', error);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save configuration to file
 */
export function saveConfig(config: Partial<Config>): void {
  ensureConfigDir();
  
  const currentConfig = loadConfig();
  const newConfig = { ...currentConfig, ...config };
  
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving config file:', error);
    throw error;
  }
}

/**
 * Clear configuration (logout)
 */
export function clearConfig(): void {
  const config = loadConfig();
  saveConfig({
    apiUrl: config.apiUrl,
    accessToken: undefined,
    refreshToken: undefined,
    user: undefined,
  });
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const config = loadConfig();
  return !!config.accessToken;
}

/**
 * Get access token
 */
export function getAccessToken(): string | undefined {
  const config = loadConfig();
  return config.accessToken;
}

/**
 * Get API URL
 */
export function getApiUrl(): string {
  const config = loadConfig();
  return config.apiUrl;
}
