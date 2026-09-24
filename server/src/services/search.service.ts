import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface SearchFilters {
  query?: string;
  mimeType?: string;
  minSize?: number;
  maxSize?: number;
  startDate?: Date;
  endDate?: Date;
  folderId?: string;
  includeSubfolders?: boolean;
}

export interface SearchResult<T> {
  results: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SearchService {
  /**
   * Search files with filters and pagination
   */
  static async searchFiles(
    userId: string,
    filters: SearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult<any>> {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.FileWhereInput = {
      ownerId: userId,
      isTrashed: false,
    };

    // Text search on name
    if (filters.query) {
      where.name = {
        contains: filters.query,
        mode: 'insensitive',
      };
    }

    // MIME type filter
    if (filters.mimeType) {
      where.mimeType = {
        contains: filters.mimeType,
        mode: 'insensitive',
      };
    }

    // Size range filter
    if (filters.minSize !== undefined || filters.maxSize !== undefined) {
      where.size = {};
      if (filters.minSize !== undefined) {
        where.size.gte = filters.minSize;
      }
      if (filters.maxSize !== undefined) {
        where.size.lte = filters.maxSize;
      }
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    // Folder filter
    if (filters.folderId) {
      if (filters.includeSubfolders) {
        // Get all descendant folder IDs
        const descendantIds = await this.getDescendantFolderIds(filters.folderId);
        where.folderId = {
          in: [...descendantIds, filters.folderId],
        };
      } else {
        where.folderId = filters.folderId;
      }
    }

    // Execute search with pagination
    const [results, total] = await Promise.all([
      prisma.file.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          size: true,
          mimeType: true,
          storagePath: true,
          visibility: true,
          folderId: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
          currentVer: true,
          folder: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.file.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      results,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Search folders with filters and pagination
   */
  static async searchFolders(
    userId: string,
    filters: SearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult<any>> {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.FolderWhereInput = {
      ownerId: userId,
      isTrashed: false,
    };

    // Text search on name
    if (filters.query) {
      where.name = {
        contains: filters.query,
        mode: 'insensitive',
      };
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    // Parent folder filter
    if (filters.folderId) {
      if (filters.includeSubfolders) {
        // Get all descendant folder IDs
        const descendantIds = await this.getDescendantFolderIds(filters.folderId);
        where.parentId = {
          in: [...descendantIds, filters.folderId],
        };
      } else {
        where.parentId = filters.folderId;
      }
    }

    // Execute search with pagination
    const [results, total] = await Promise.all([
      prisma.folder.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          visibility: true,
          parentId: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              files: true,
              subfolders: true,
            },
          },
        },
      }),
      prisma.folder.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      results,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Global search across both files and folders
   */
  static async globalSearch(
    userId: string,
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    files: SearchResult<any>;
    folders: SearchResult<any>;
    totalResults: number;
  }> {
    const fileLimit = Math.ceil(limit / 2);
    const folderLimit = Math.floor(limit / 2);

    const [files, folders] = await Promise.all([
      this.searchFiles(userId, { query }, page, fileLimit),
      this.searchFolders(userId, { query }, page, folderLimit),
    ]);

    return {
      files,
      folders,
      totalResults: files.total + folders.total,
    };
  }

  /**
   * Search by MIME type category
   */
  static async searchByType(
    userId: string,
    category: 'image' | 'video' | 'audio' | 'document' | 'archive',
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResult<any>> {
    const mimeTypePatterns: Record<string, string[]> = {
      image: ['image/'],
      video: ['video/'],
      audio: ['audio/'],
      document: ['application/pdf', 'application/msword', 'application/vnd.', 'text/'],
      archive: ['application/zip', 'application/x-rar', 'application/x-7z', 'application/x-tar'],
    };

    const patterns = mimeTypePatterns[category];
    if (!patterns) {
      throw new Error('Invalid category');
    }

    const skip = (page - 1) * limit;

    const where: Prisma.FileWhereInput = {
      ownerId: userId,
      isTrashed: false,
      OR: patterns.map((pattern) => ({
        mimeType: {
          startsWith: pattern,
        },
      })),
    };

    const [results, total] = await Promise.all([
      prisma.file.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          size: true,
          mimeType: true,
          storagePath: true,
          visibility: true,
          folderId: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
          folder: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.file.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      results,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Search recent files (sorted by updatedAt)
   */
  static async searchRecent(
    userId: string,
    limit: number = 20
  ): Promise<any[]> {
    const files = await prisma.file.findMany({
      where: {
        ownerId: userId,
        isTrashed: false,
      },
      take: limit,
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        size: true,
        mimeType: true,
        storagePath: true,
        visibility: true,
        folderId: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return files;
  }

  /**
   * Search large files (sorted by size)
   */
  static async searchLargeFiles(
    userId: string,
    minSize: number = 10485760, // 10 MB default
    limit: number = 20
  ): Promise<any[]> {
    const files = await prisma.file.findMany({
      where: {
        ownerId: userId,
        isTrashed: false,
        size: {
          gte: minSize,
        },
      },
      take: limit,
      orderBy: {
        size: 'desc',
      },
      select: {
        id: true,
        name: true,
        size: true,
        mimeType: true,
        storagePath: true,
        visibility: true,
        folderId: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return files;
  }

  /**
   * Helper: Get all descendant folder IDs recursively
   */
  private static async getDescendantFolderIds(
    folderId: string,
    collected: string[] = []
  ): Promise<string[]> {
    const children = await prisma.folder.findMany({
      where: {
        parentId: folderId,
        isTrashed: false,
      },
      select: {
        id: true,
      },
    });

    for (const child of children) {
      collected.push(child.id);
      await this.getDescendantFolderIds(child.id, collected);
    }

    return collected;
  }
}
