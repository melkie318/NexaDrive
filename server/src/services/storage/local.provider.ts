import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { StorageProvider } from './storage.provider';
import { config } from '../../config/env';

/**
 * LocalStorageProvider
 *
 * Stores files on the local filesystem under:
 *   <STORAGE_UPLOAD_DIR>/<userId>/<timestamp>-<randomHex>-<safeName>
 *
 * This is the default provider for development.
 * In production (Phase 20) this will be replaced by S3StorageProvider
 * without any changes to file.service.ts or quota.service.ts.
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;

  constructor(uploadDir?: string) {
    this.root = path.resolve(uploadDir ?? config.storage.uploadDir);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Build a safe, collision-resistant storage key.
   * Format: <userId>/<timestamp>-<randomHex>-<sanitisedName>
   */
  private buildKey(userId: string, name: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(16).slice(2, 10);
    const safe = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(userId, `${timestamp}-${random}-${safe}`);
  }

  /** Absolute filesystem path for a given storage key. */
  resolve(storageKey: string): string {
    return path.resolve(this.root, storageKey);
  }

  /** Ensure the user-scoped subdirectory exists. */
  private async ensureDir(userId: string): Promise<void> {
    await fsPromises.mkdir(path.resolve(this.root, userId), { recursive: true });
  }

  /**
   * Path-traversal guard: the resolved path must sit inside this.root.
   */
  private assertSafe(resolved: string): void {
    const root = this.root + path.sep;
    if (!resolved.startsWith(root) && resolved !== this.root) {
      throw new Error('Path traversal detected — access denied');
    }
  }

  // ─── StorageProvider implementation ───────────────────────────────────────

  async save(tempPath: string, userId: string, originalName: string): Promise<string> {
    const key = this.buildKey(userId, originalName);
    const dest = this.resolve(key);
    this.assertSafe(dest);
    await this.ensureDir(userId);
    await fsPromises.rename(tempPath, dest);
    return key;
  }

  async delete(storageKey: string): Promise<void> {
    const filePath = this.resolve(storageKey);
    this.assertSafe(filePath);
    await fsPromises.unlink(filePath).catch(() => {
      // Idempotent — file already gone is fine
    });
  }

  async copy(sourceKey: string, userId: string, newName: string): Promise<string> {
    const srcPath = this.resolve(sourceKey);
    this.assertSafe(srcPath);

    const newKey = this.buildKey(userId, newName);
    const destPath = this.resolve(newKey);
    this.assertSafe(destPath);

    await this.ensureDir(userId);
    await fsPromises.copyFile(srcPath, destPath);
    return newKey;
  }

  async exists(storageKey: string): Promise<boolean> {
    const filePath = this.resolve(storageKey);
    this.assertSafe(filePath);
    try {
      await fsPromises.access(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  async size(storageKey: string): Promise<number> {
    const filePath = this.resolve(storageKey);
    this.assertSafe(filePath);
    const stat = await fsPromises.stat(filePath);
    return stat.size;
  }
}
