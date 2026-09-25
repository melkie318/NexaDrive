import { Socket } from 'socket.io';

/**
 * Extended Socket with authenticated user
 */
export interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

/**
 * Socket.IO Event Names
 */
export enum SocketEvent {
  // Connection events
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  ERROR = 'error',

  // Room events
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',

  // File events
  FILE_UPLOADED = 'file:uploaded',
  FILE_UPDATED = 'file:updated',
  FILE_DELETED = 'file:deleted',
  FILE_RESTORED = 'file:restored',
  FILE_MOVED = 'file:moved',
  FILE_RENAMED = 'file:renamed',
  FILE_DOWNLOADING = 'file:downloading',

  // Folder events
  FOLDER_CREATED = 'folder:created',
  FOLDER_UPDATED = 'folder:updated',
  FOLDER_DELETED = 'folder:deleted',
  FOLDER_RESTORED = 'folder:restored',
  FOLDER_MOVED = 'folder:moved',
  FOLDER_RENAMED = 'folder:renamed',

  // Share events
  RESOURCE_SHARED = 'share:created',
  SHARE_REVOKED = 'share:revoked',
  PERMISSION_CHANGED = 'permission:changed',

  // Notification events
  NEW_NOTIFICATION = 'notification:new',
  NOTIFICATION_READ = 'notification:read',
  NOTIFICATIONS_CLEARED = 'notifications:cleared',

  // Collaboration events
  USER_TYPING = 'user:typing',
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',

  // Storage events
  QUOTA_UPDATED = 'quota:updated',
  QUOTA_WARNING = 'quota:warning',
  QUOTA_EXCEEDED = 'quota:exceeded',
}

/**
 * Room naming conventions
 */
export class SocketRoom {
  // User's personal room for private notifications
  static user(userId: string): string {
    return `user:${userId}`;
  }

  // Folder room for collaborative updates
  static folder(folderId: string): string {
    return `folder:${folderId}`;
  }

  // File room for collaborative updates
  static file(fileId: string): string {
    return `file:${fileId}`;
  }

  // Group room for group notifications
  static group(groupId: string): string {
    return `group:${groupId}`;
  }
}

/**
 * Event Payload Interfaces
 */

export interface FileUploadedPayload {
  fileId: string;
  fileName: string;
  size: number;
  mimeType: string;
  folderId?: string;
  uploadedBy: {
    id: string;
    username: string;
    email: string;
  };
  timestamp: Date;
}

export interface FileUpdatedPayload {
  fileId: string;
  fileName: string;
  changes: string[];
  updatedBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

export interface FileDeletedPayload {
  fileId: string;
  fileName: string;
  deletedBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

export interface FileRestoredPayload {
  fileId: string;
  fileName: string;
  restoredBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

export interface FileMovedPayload {
  fileId: string;
  fileName: string;
  fromFolderId?: string;
  toFolderId?: string;
  movedBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

export interface FileRenamedPayload {
  fileId: string;
  oldName: string;
  newName: string;
  renamedBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

export interface FolderCreatedPayload {
  folderId: string;
  folderName: string;
  parentId?: string;
  createdBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

export interface FolderUpdatedPayload {
  folderId: string;
  folderName: string;
  changes: string[];
  updatedBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

export interface FolderDeletedPayload {
  folderId: string;
  folderName: string;
  deletedBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

export interface FolderRestoredPayload {
  folderId: string;
  folderName: string;
  restoredBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

export interface ResourceSharedPayload {
  shareId: string;
  resourceType: 'file' | 'folder';
  resourceId: string;
  resourceName: string;
  sharedWith: {
    id: string;
    email: string;
    username: string;
  };
  permission: string;
  sharedBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

export interface ShareRevokedPayload {
  shareId: string;
  resourceType: 'file' | 'folder';
  resourceId: string;
  resourceName: string;
  revokedFrom: {
    id: string;
    username: string;
  };
  revokedBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

export interface PermissionChangedPayload {
  resourceType: 'file' | 'folder';
  resourceId: string;
  resourceName: string;
  userId: string;
  oldPermission: string;
  newPermission: string;
  changedBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

export interface NewNotificationPayload {
  notificationId: string;
  title: string;
  message: string;
  type: string;
  timestamp: Date;
}

export interface QuotaUpdatedPayload {
  userId: string;
  oldQuota: string;
  newQuota: string;
  usedStorage: string;
  timestamp: Date;
}

export interface QuotaWarningPayload {
  userId: string;
  usagePercentage: number;
  usedStorage: string;
  totalQuota: string;
  level: 'warning' | 'critical';
  timestamp: Date;
}

export interface UserTypingPayload {
  userId: string;
  username: string;
  resourceId: string;
  resourceType: 'file' | 'folder';
}

export interface UserOnlinePayload {
  userId: string;
  username: string;
  timestamp: Date;
}

export interface JoinRoomPayload {
  room: string;
}

export interface LeaveRoomPayload {
  room: string;
}

/**
 * Socket Server-to-Client Events Map
 */
export interface ServerToClientEvents {
  [SocketEvent.FILE_UPLOADED]: (payload: FileUploadedPayload) => void;
  [SocketEvent.FILE_UPDATED]: (payload: FileUpdatedPayload) => void;
  [SocketEvent.FILE_DELETED]: (payload: FileDeletedPayload) => void;
  [SocketEvent.FILE_RESTORED]: (payload: FileRestoredPayload) => void;
  [SocketEvent.FILE_MOVED]: (payload: FileMovedPayload) => void;
  [SocketEvent.FILE_RENAMED]: (payload: FileRenamedPayload) => void;
  
  [SocketEvent.FOLDER_CREATED]: (payload: FolderCreatedPayload) => void;
  [SocketEvent.FOLDER_UPDATED]: (payload: FolderUpdatedPayload) => void;
  [SocketEvent.FOLDER_DELETED]: (payload: FolderDeletedPayload) => void;
  [SocketEvent.FOLDER_RESTORED]: (payload: FolderRestoredPayload) => void;
  
  [SocketEvent.RESOURCE_SHARED]: (payload: ResourceSharedPayload) => void;
  [SocketEvent.SHARE_REVOKED]: (payload: ShareRevokedPayload) => void;
  [SocketEvent.PERMISSION_CHANGED]: (payload: PermissionChangedPayload) => void;
  
  [SocketEvent.NEW_NOTIFICATION]: (payload: NewNotificationPayload) => void;
  [SocketEvent.NOTIFICATION_READ]: (payload: { notificationId: string }) => void;
  [SocketEvent.NOTIFICATIONS_CLEARED]: (payload: { count: number }) => void;
  
  [SocketEvent.QUOTA_UPDATED]: (payload: QuotaUpdatedPayload) => void;
  [SocketEvent.QUOTA_WARNING]: (payload: QuotaWarningPayload) => void;
  [SocketEvent.QUOTA_EXCEEDED]: (payload: QuotaWarningPayload) => void;
  
  [SocketEvent.USER_TYPING]: (payload: UserTypingPayload) => void;
  [SocketEvent.USER_ONLINE]: (payload: UserOnlinePayload) => void;
  [SocketEvent.USER_OFFLINE]: (payload: UserOnlinePayload) => void;
  
  [SocketEvent.ERROR]: (payload: { message: string; code?: string }) => void;
}

/**
 * Socket Client-to-Server Events Map
 */
export interface ClientToServerEvents {
  [SocketEvent.JOIN_ROOM]: (payload: JoinRoomPayload, callback?: (success: boolean) => void) => void;
  [SocketEvent.LEAVE_ROOM]: (payload: LeaveRoomPayload, callback?: (success: boolean) => void) => void;
  [SocketEvent.USER_TYPING]: (payload: UserTypingPayload) => void;
}

/**
 * Socket Inter-Server Events (for scaling)
 */
export interface InterServerEvents {
  ping: () => void;
}

/**
 * Socket Data (attached to each socket instance)
 */
export interface SocketData {
  userId: string;
  username: string;
  connectedAt: Date;
}
