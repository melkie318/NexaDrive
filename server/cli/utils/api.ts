import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { getApiUrl, getAccessToken } from './config';

/**
 * Create axios instance with authentication
 */
export function createApiClient(): AxiosInstance {
  const apiUrl = getApiUrl();
  const token = getAccessToken();

  const client = axios.create({
    baseURL: apiUrl,
    headers: token ? {
      Authorization: `Bearer ${token}`,
    } : {},
  });

  return client;
}

/**
 * Upload file to NexaDrive
 */
export async function uploadFile(
  filePath: string,
  folderId?: string
): Promise<any> {
  const client = createApiClient();
  const form = new FormData();
  
  form.append('file', fs.createReadStream(filePath));
  if (folderId) {
    form.append('folderId', folderId);
  }

  const response = await client.post('/files/upload', form, {
    headers: form.getHeaders(),
  });

  return response.data;
}

/**
 * Download file from NexaDrive
 */
export async function downloadFile(
  fileId: string,
  outputPath: string
): Promise<void> {
  const client = createApiClient();
  
  const response = await client.get(`/files/${fileId}/download`, {
    responseType: 'stream',
  });

  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

/**
 * Make authenticated API request
 */
export async function apiRequest<T = any>(
  method: string,
  endpoint: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const client = createApiClient();
  
  const response = await client.request({
    method,
    url: endpoint,
    data,
    ...config,
  });

  return response.data;
}
