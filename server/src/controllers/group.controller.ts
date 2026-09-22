import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { GroupService } from '../services/group.service';
import {
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from '../validations/group.validation';

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Group management and collaboration
 */

export class GroupController {
  /**
   * @swagger
   * /api/v1/groups:
   *   post:
   *     summary: Create a new group
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 100
   *               description:
   *                 type: string
   *                 maxLength: 500
   *     responses:
   *       201:
   *         description: Group created successfully
   */
  static create = asyncHandler(async (req: Request, res: Response) => {
    const data = createGroupSchema.parse(req.body);
    const group = await GroupService.create(req.user!.id, data);
    return sendResponse(res, {
      statusCode: 201,
      message: 'Group created successfully',
      data: group,
    });
  });

  /**
   * @swagger
   * /api/v1/groups:
   *   get:
   *     summary: List all groups I'm a member of
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Groups retrieved successfully
   */
  static list = asyncHandler(async (req: Request, res: Response) => {
    const groups = await GroupService.list(req.user!.id);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Groups retrieved successfully',
      data: groups,
    });
  });

  /**
   * @swagger
   * /api/v1/groups/{groupId}:
   *   get:
   *     summary: Get group details (members must be part of the group)
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: groupId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Group details retrieved successfully
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const group = await GroupService.getById(req.user!.id, req.params.groupId as string);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Group retrieved successfully',
      data: group,
    });
  });

  /**
   * @swagger
   * /api/v1/groups/{groupId}:
   *   patch:
   *     summary: Update group name or description (admin only)
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: groupId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *     responses:
   *       200:
   *         description: Group updated successfully
   */
  static update = asyncHandler(async (req: Request, res: Response) => {
    const data = updateGroupSchema.parse(req.body);
    const group = await GroupService.update(req.user!.id, req.params.groupId as string, data);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Group updated successfully',
      data: group,
    });
  });

  /**
   * @swagger
   * /api/v1/groups/{groupId}:
   *   delete:
   *     summary: Delete a group (admin only)
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: groupId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Group deleted successfully
   */
  static delete = asyncHandler(async (req: Request, res: Response) => {
    const result = await GroupService.delete(req.user!.id, req.params.groupId as string);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Group deleted successfully',
      data: result,
    });
  });

  /**
   * @swagger
   * /api/v1/groups/{groupId}/members:
   *   post:
   *     summary: Add a member to the group (admin only)
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: groupId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [userId]
   *             properties:
   *               userId:
   *                 type: string
   *               role:
   *                 type: string
   *                 enum: [ADMIN, MEMBER]
   *     responses:
   *       201:
   *         description: Member added successfully
   */
  static addMember = asyncHandler(async (req: Request, res: Response) => {
    const data = addMemberSchema.parse(req.body);
    const member = await GroupService.addMember(req.user!.id, req.params.groupId as string, data);
    return sendResponse(res, {
      statusCode: 201,
      message: 'Member added successfully',
      data: member,
    });
  });

  /**
   * @swagger
   * /api/v1/groups/{groupId}/members/{memberId}:
   *   delete:
   *     summary: Remove a member from the group (admin only, or self)
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: groupId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: memberId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Member removed successfully
   */
  static removeMember = asyncHandler(async (req: Request, res: Response) => {
    const result = await GroupService.removeMember(
      req.user!.id,
      req.params.groupId as string,
      req.params.memberId as string,
    );
    return sendResponse(res, {
      statusCode: 200,
      message: 'Member removed successfully',
      data: result,
    });
  });

  /**
   * @swagger
   * /api/v1/groups/{groupId}/members/{memberId}/role:
   *   patch:
   *     summary: Update a member's role (admin only)
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: groupId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: memberId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [role]
   *             properties:
   *               role:
   *                 type: string
   *                 enum: [ADMIN, MEMBER]
   *     responses:
   *       200:
   *         description: Member role updated successfully
   */
  static updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
    const data = updateMemberRoleSchema.parse(req.body);
    const member = await GroupService.updateMemberRole(
      req.user!.id,
      req.params.groupId as string,
      req.params.memberId as string,
      data,
    );
    return sendResponse(res, {
      statusCode: 200,
      message: 'Member role updated successfully',
      data: member,
    });
  });
}
