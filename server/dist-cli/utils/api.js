import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { getApiUrl, getAccessToken } from './config';
/**
 * Create axios instance with authentication
 */
export function createApiClient() {
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
export async function uploadFile(filePath, folderId) {
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
export async function downloadFile(fileId, outputPath) {
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
export async function apiRequest(method, endpoint, data, config) {
    const client = createApiClient();
    const response = await client.request({
        method,
        url: endpoint,
        data,
        ...config,
    });
    return response.data;
}
