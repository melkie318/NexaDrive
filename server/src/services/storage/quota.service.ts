import prisma from '../../lib/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { Prisma } from '@prisma/client';

/**
 * Result returned by QuotaService.check()
 */
export interface QuotaCheckResult {
  /** Whether the upload is allowed */
  allowed: boolean;
  /** User's total quota in bytes */
  quota: number;
  /** Bytes already consumed */
  used: number;
  /** Bytes still available */
  available: number;
  /** Usage as a percentage (0–100, two decimal places) */
  usagePercent: number;
}

/**
 * QuotaService
 *
 * Single source of truth for all storage quota logic.
 * Used by FileService before every upload and copy so the upload/copy flow is:
 *
 *   Upload request
 *     ↓
 *   Check file size (multer limit)
 *     ↓
 *   QuotaService.check()
 *     ↓
 *   Enough space?
 *     ↙ YES          ↘ NO
 *   Upload          Reject (413)
 */
export class QuotaService {
  /**
   * Check whether a user has enough remaining quota for a given number of bytes.
   *
   * @param userId    - the user to check
   * @param required  - bytes needed (BigInt or number)
   * @returns QuotaCheckResult — always returns a result; caller decides to reject
   */
  static async check(
    userId: string,
    required: bigint | number,
  ): Promise<QuotaCheckResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageQuota: true, usedStorage: true },
    });

    if (!user) throw new AppError('User not found', 404);

    const quota     = user.storageQuota;
    const used      = user.usedStorage;
    const available = quota - used;
    const needed    = typeof required === 'number' ? BigInt(required) : required;

    const usagePercent =
      quota > BigInt(0)
        ? Math.round((Number((used * BigInt(10000)) / quota)) / 100) / 1
        : 0;

    return {
      allowed:      needed <= available,
      quota:        Number(quota),
      used:         Number(used),
      available:    Number(available),
      usagePercent: Math.round(usagePercent * 100) / 100,
    };
  }

  /**
   * Get the full quota stats for a user (for the GET /storage/quota endpoint).
   * Includes file/folder counts and a near-full warning flag.
   */
  static async getStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageQuota: true, usedStorage: true },
    });

    if (!user) throw new AppError('User not found', 404);

    const [fileCount, folderCount, trashedFileCount, trashedFolderCount] =
      await Promise.all([
        prisma.file.count({ where: { ownerId: userId, isTrashed: false } }),
        prisma.folder.count({ where: { ownerId: userId, isTrashed: false } }),
        prisma.file.count({ where: { ownerId: userId, isTrashed: true } }),
        prisma.folder.count({ where: { ownerId: userId, isTrashed: true } }),
      ]);

    const quota     = user.storageQuota;
    const used      = user.usedStorage;
    const available = quota - used;

    const usagePercent =
      quota > BigInt(0)
        ? Math.round(Number((used * BigInt(10000)) / quota)) / 100
        : 0;

    return {
      storageQuota:      quota.toString(),
      usedStorage:       used.toString(),
      availableStorage:  available.toString(),
      usagePercent,
      /** True when usage is ≥ 90 % — useful for frontend warnings */
      isNearFull:        usagePercent >= 90,
      /** True when no space remains */
      isFull:            available <= BigInt(0),
      fileCount,
      folderCount,
      trashedFileCount,
      trashedFolderCount,
    };
  }

  /**
   * Atomically increment a user's usedStorage.
   * Accepts an optional Prisma transaction client so it can participate in the
   * same transaction as the file creation (upload / copy).
   */
  static async increment(
    userId: string,
    bytes: bigint | number,
    tx?: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  ): Promise<void> {
    const client = (tx ?? prisma) as typeof prisma;
    const amount = typeof bytes === 'number' ? BigInt(bytes) : bytes;
    await client.user.update({
      where: { id: userId },
      data: { usedStorage: { increment: amount } },
    });
  }

  /**
   * Atomically decrement a user's usedStorage (used when a file is permanently deleted).
   * Will not go below zero.
   */
  static async decrement(
    userId: string,
    bytes: bigint | number,
    tx?: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  ): Promise<void> {
    const client = (tx ?? prisma) as typeof prisma;
    const amount = typeof bytes === 'number' ? BigInt(bytes) : bytes;

    // Fetch current value first so we can clamp at zero
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { usedStorage: true },
    });

    if (!user) return;

    const newUsed = user.usedStorage - amount < BigInt(0)
      ? BigInt(0)
      : user.usedStorage - amount;

    await client.user.update({
      where: { id: userId },
      data: { usedStorage: newUsed },
    });
  }
}
