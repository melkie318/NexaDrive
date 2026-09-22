import { Request, Response, NextFunction } from 'express';
import { PermissionService, ResourceType, Operation } from '../services/permission.service';
import { AppError } from './errorHandler';

/**
 * requirePermission — reusable route-level permission guard.
 *
 * Usage in a router:
 *
 *   router.get(
 *     '/:id',
 *     requirePermission('folder', (req) => req.params.id, 'canView'),
 *     FolderController.getFolderById,
 *   );
 *
 * How it works:
 *   1. Calls PermissionService.can() with the authenticated user, resource type,
 *      resolved resource ID, and required operation.
 *   2. If allowed → calls next() and the real handler runs.
 *   3. If denied  → throws AppError(403) which the global error handler catches.
 *
 * The resource ID resolver is a function so it can read req.params at runtime —
 * this keeps the middleware declarative at the route level.
 *
 * OWNER bypass:
 *   PermissionService.can() already resolves ownership first (see permission.service.ts),
 *   so owners always pass this guard without any extra logic here.
 */
export function requirePermission(
  resourceType: ResourceType,
  resolveId: (req: Request) => string | string[],
  operation: Operation,
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }

      const raw = resolveId(req);
      const resourceId = Array.isArray(raw) ? raw[0] : raw;

      if (!resourceId) {
        return next(new AppError('Resource ID is missing', 400));
      }

      const allowed = await PermissionService.can(
        req.user.id,
        resourceType,
        resourceId,
        operation,
      );

      if (!allowed) {
        return next(
          new AppError(
            `You do not have permission to perform this action on this ${resourceType}`,
            403,
          ),
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
