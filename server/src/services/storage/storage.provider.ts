/**
 * StorageProvider — abstract interface for all storage backends.
 *
 * Current implementation: LocalStorageProvider (writes to uploads/ on disk).
 * Future implementation: S3StorageProvider (writes to S3-compatible object store).
 *
 * All file.service.ts I/O goes through this interface so swapping the backend
 * in Phase 20 (production) requires changing only the provider, not the service.
 */
export interface StorageProvider {
  /**
   * Persist a file from a temp path to permanent storage.
   * Returns the storage key (relative path) that identifies the file.
   *
   * @param tempPath     - absolute path to the temp file written by multer
   * @param userId       - owner's ID (used for scoping the storage key)
   * @param originalName - original filename (used to build a safe key)
   */
  save(tempPath: string, userId: string, originalName: string): Promise<string>;

  /**
   * Delete the physical file identified by the given storage key.
   * Should NOT throw if the file is already gone (idempotent).
   */
  delete(storageKey: string): Promise<void>;

  /**
   * Copy the physical file to a new storage key (same bucket / directory).
   * Returns the new storage key.
   */
  copy(sourceKey: string, userId: string, newName: string): Promise<string>;

  /**
   * Return the absolute path (local) or a presigned URL (S3) for streaming.
   * For local storage this is always an absolute filesystem path.
   */
  resolve(storageKey: string): string;

  /**
   * Check whether the physical file exists and is readable.
   */
  exists(storageKey: string): Promise<boolean>;

  /**
   * Return the byte size of the file at the given storage key.
   */
  size(storageKey: string): Promise<number>;
}
