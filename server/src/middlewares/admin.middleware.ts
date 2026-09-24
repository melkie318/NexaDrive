import { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../utils/response';

/**
 * Middleware to check if the authenticated user has ADMIN role
 * Must be used after authenticateUser middleware
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return sendResponse(res, {
        statusCode: 401,
        message: 'Authentication required',
        data: null,
      });
    }

    // Check if user has ADMIN role
    if (req.user.role !== 'ADMIN') {
      return sendResponse(res, {
        statusCode: 403,
        message: 'Access denied. Administrator privileges required.',
        data: null,
      });
    }

    // User is admin, proceed to next middleware/controller
    next();
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      message: 'Authorization check failed',
      data: null,
    });
  }
};
