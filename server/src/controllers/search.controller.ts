import { Request, Response } from 'express';
import { SearchService } from '../services/search.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import {
  searchFilesSchema,
  searchFoldersSchema,
  globalSearchSchema,
  searchByTypeSchema,
  searchRecentSchema,
  searchLargeFilesSchema,
} from '../validations/search.validation';

export class SearchController {
  /**
   * Search files with filters
   * GET /api/v1/search/files
   */
  static searchFiles = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validated = searchFilesSchema.parse(req.query);

    const filters = {
      query: validated.query,
      mimeType: validated.mimeType,
      minSize: validated.minSize,
      maxSize: validated.maxSize,
      startDate: validated.startDate,
      endDate: validated.endDate,
      folderId: validated.folderId,
      includeSubfolders: validated.includeSubfolders,
    };

    const result = await SearchService.searchFiles(
      userId,
      filters,
      validated.page,
      validated.limit
    );

    sendResponse(res, {
      statusCode: 200,
      message: 'Files retrieved successfully',
      data: result.results,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * Search folders with filters
   * GET /api/v1/search/folders
   */
  static searchFolders = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validated = searchFoldersSchema.parse(req.query);

    const filters = {
      query: validated.query,
      startDate: validated.startDate,
      endDate: validated.endDate,
      folderId: validated.folderId,
      includeSubfolders: validated.includeSubfolders,
    };

    const result = await SearchService.searchFolders(
      userId,
      filters,
      validated.page,
      validated.limit
    );

    sendResponse(res, {
      statusCode: 200,
      message: 'Folders retrieved successfully',
      data: result.results,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * Global search across files and folders
   * GET /api/v1/search
   */
  static globalSearch = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validated = globalSearchSchema.parse(req.query);

    const result = await SearchService.globalSearch(
      userId,
      validated.query,
      validated.page,
      validated.limit
    );

    sendResponse(res, {
      statusCode: 200,
      message: 'Search completed successfully',
      data: result,
    });
  });

  /**
   * Search files by type category
   * GET /api/v1/search/type/:category
   */
  static searchByType = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const category = req.params.category as string;
    const validated = searchByTypeSchema.parse({
      category,
      page: req.query.page,
      limit: req.query.limit,
    });

    const result = await SearchService.searchByType(
      userId,
      validated.category,
      validated.page,
      validated.limit
    );

    sendResponse(res, {
      statusCode: 200,
      message: `${validated.category} files retrieved successfully`,
      data: result.results,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * Get recent files
   * GET /api/v1/search/recent
   */
  static searchRecent = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validated = searchRecentSchema.parse(req.query);

    const result = await SearchService.searchRecent(userId, validated.limit);

    sendResponse(res, {
      statusCode: 200,
      message: 'Recent files retrieved successfully',
      data: result,
    });
  });

  /**
   * Get large files
   * GET /api/v1/search/large
   */
  static searchLargeFiles = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const validated = searchLargeFilesSchema.parse(req.query);

    const result = await SearchService.searchLargeFiles(
      userId,
      validated.minSize,
      validated.limit
    );

    sendResponse(res, {
      statusCode: 200,
      message: 'Large files retrieved successfully',
      data: result,
    });
  });
}
