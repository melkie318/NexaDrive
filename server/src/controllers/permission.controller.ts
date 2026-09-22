import { Request, Response } from 'express';
import { PermissionService, ResourceType } from '../services/permission.service';
import { sendResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middlewares/errorHandler';
import {
  grantPermissionSchema,
  updatePermissionSchema,
} from '../validations/permission.validation';

/**
 * Extracts and validates resourceType from req.params.resourceType.
 * Must be "file" or "folder".
 */
function parseResourceType(raw: string): ResourceType {
  if (raw === 'file' || raw === 'folder') return raw;
  throw new AppError('resourceType must be "file" or "folder"', 400);
}

export class PermissionController {
  /**
   * POST /api/v1/permissions/:resourceType/:resourceId
   * Grant a permission to a user or group on a resource.
   */
  static grant = asyncHandler(async (req: Request, res: Response) => {
    const resourceType = parseResourceType(req.params.resourceType as string);
    const resourceId   = req.params.resourceId as string;
    const data         = grantPermissionSchema.parse(req.body);

    const result = await PermissionService.grant(
      req.user!.id,
      resourceType,
      resourceId,
      data,
    );

    return sendResponse(res, {
      statusCode: 201,
      message: 'Permission granted',
      data: result,
    });
  });

  /**
   * GET /api/v1/permissions/:resourceType/:resourceId
   * List all permissions on a resource (requires canManagePermissions).
   */
  static list = asyncHandler(async (req: Request, res: Response) => {
    const resourceType = parseResourceType(req.params.resourceType as string);
    const resourceId   = req.params.resourceId as string;

    const result = await PermissionService.list(
      req.user!.id,
      resourceType,
      resourceId,
    );

    return sendResponse(res, {
      statusCode: 200,
      message: 'Permissions retrieved',
      data: result,
    });
  });

  /**
   * GET /api/v1/permissions/:resourceType/:resourceId/me
   * Return the calling user's effective permission map on a resource.
   */
  static getMyPermissions = asyncHandler(async (req: Request, res: Response) => {
    const resourceType = parseResourceType(req.params.resourceType as string);
    const resourceId   = req.params.resourceId as string;

    const result = await PermissionService.getMyPermissions(
      req.user!.id,
      resourceType,
      resourceId,
    );

    return sendResponse(res, {
      statusCode: 200,
      message: 'Effective permissions retrieved',
      data: result,
    });
  });

  /**
   * PATCH /api/v1/permissions/:resourceType/:resourceId/:permissionId
   * Update an existing permission's role or customOps.
   */
  static update = asyncHandler(async (req: Request, res: Response) => {
    const resourceType = parseResourceType(req.params.resourceType as string);
    const resourceId   = req.params.resourceId as string;
    const permissionId = req.params.permissionId as string;
    const data         = updatePermissionSchema.parse(req.body);

    const result = await PermissionService.update(
      req.user!.id,
      resourceType,
      resourceId,
      permissionId,
      data,
    );

    return sendResponse(res, {
      statusCode: 200,
      message: 'Permission updated',
      data: result,
    });
  });

  /**
   * DELETE /api/v1/permissions/:resourceType/:resourceId/:permissionId
   * Revoke a permission entry.
   */
  static revoke = asyncHandler(async (req: Request, res: Response) => {
    const resourceType = parseResourceType(req.params.resourceType as string);
    const resourceId   = req.params.resourceId as string;
    const permissionId = req.params.permissionId as string;

    const result = await PermissionService.revoke(
      req.user!.id,
      resourceType,
      resourceId,
      permissionId,
    );

    return sendResponse(res, {
      statusCode: 200,
      message: 'Permission revoked',
      data: result,
    });
  });
}
