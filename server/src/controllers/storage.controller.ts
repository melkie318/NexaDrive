import { Request, Response } from 'express';
import { sendResponse } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { QuotaService } from '../services/storage/quota.service';

export class StorageController {
  /**
   * GET /api/v1/storage/quota
   * Returns full quota stats for the authenticated user.
   */
  static getQuota = asyncHandler(async (req: Request, res: Response) => {
    const result = await QuotaService.getStats(req.user!.id);

    return sendResponse(res, {
      statusCode: 200,
      message: 'Storage quota retrieved',
      data: result,
    });
  });
}
