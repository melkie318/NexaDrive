import { Server as SocketIOServer } from 'socket.io';
import {
  SocketEvent,
  SocketRoom,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  FileUploadedPayload,
  FileUpdatedPayload,
  FileDeletedPayload,
  FileRestoredPayload,
  FileMovedPayload,
  FileRenamedPayload,
  FolderCreatedPayload,
  FolderUpdatedPayload,
  FolderDeletedPayload,
  FolderRestoredPayload,
  ResourceSharedPayload,
  ShareRevokedPayload,
  PermissionChangedPayload,
  NewNotificationPayload,
  QuotaUpdatedPayload,
  QuotaWarningPayload,
  UserOnlinePayload,
} from '../types/socket.types';

/**
 * Socket Service for emitting real-time events
 * Provides methods to emit events to specific users, rooms, or broadcast
 */
export class SocketService {
  private static io: SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  > | null = null;

  /**
   * Initialize the Socket.IO instance
   */
  static initialize(
    io: SocketIOServer<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >
  ): void {
    this.io = io;
  }

  /**
   * Get Socket.IO instance
   */
  static getIO(): SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  > {
    if (!this.io) {
      throw new Error('Socket.IO not initialized. Call SocketService.initialize() first.');
    }
    return this.io;
  }

  /**
   * Check if Socket.IO is initialized
   */
  static isInitialized(): boolean {
    return this.io !== null;
  }

  // ==================== File Events ====================

  static emitFileUploaded(userId: string, payload: FileUploadedPayload): void {
    if (!this.isInitialized()) return;
    this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.FILE_UPLOADED, payload);
  }

  static emitFileUpdated(userIds: string[], payload: FileUpdatedPayload): void {
    if (!this.isInitialized()) return;
    userIds.forEach(userId => {
      this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.FILE_UPDATED, payload);
    });
  }

  static emitFileDeleted(userIds: string[], payload: FileDeletedPayload): void {
    if (!this.isInitialized()) return;
    userIds.forEach(userId => {
      this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.FILE_DELETED, payload);
    });
  }

  static emitFileRestored(userId: string, payload: FileRestoredPayload): void {
    if (!this.isInitialized()) return;
    this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.FILE_RESTORED, payload);
  }

  static emitFileMoved(userIds: string[], payload: FileMovedPayload): void {
    if (!this.isInitialized()) return;
    userIds.forEach(userId => {
      this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.FILE_MOVED, payload);
    });
  }

  static emitFileRenamed(userIds: string[], payload: FileRenamedPayload): void {
    if (!this.isInitialized()) return;
    userIds.forEach(userId => {
      this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.FILE_RENAMED, payload);
    });
  }

  // ==================== Folder Events ====================

  static emitFolderCreated(userId: string, payload: FolderCreatedPayload): void {
    if (!this.isInitialized()) return;
    this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.FOLDER_CREATED, payload);
  }

  static emitFolderUpdated(userIds: string[], payload: FolderUpdatedPayload): void {
    if (!this.isInitialized()) return;
    userIds.forEach(userId => {
      this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.FOLDER_UPDATED, payload);
    });
  }

  static emitFolderDeleted(userIds: string[], payload: FolderDeletedPayload): void {
    if (!this.isInitialized()) return;
    userIds.forEach(userId => {
      this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.FOLDER_DELETED, payload);
    });
  }

  static emitFolderRestored(userId: string, payload: FolderRestoredPayload): void {
    if (!this.isInitialized()) return;
    this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.FOLDER_RESTORED, payload);
  }

  // ==================== Share Events ====================

  static emitResourceShared(userId: string, payload: ResourceSharedPayload): void {
    if (!this.isInitialized()) return;
    this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.RESOURCE_SHARED, payload);
  }

  static emitShareRevoked(userId: string, payload: ShareRevokedPayload): void {
    if (!this.isInitialized()) return;
    this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.SHARE_REVOKED, payload);
  }

  static emitPermissionChanged(userId: string, payload: PermissionChangedPayload): void {
    if (!this.isInitialized()) return;
    this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.PERMISSION_CHANGED, payload);
  }

  // ==================== Notification Events ====================

  static emitNewNotification(userId: string, payload: NewNotificationPayload): void {
    if (!this.isInitialized()) return;
    this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.NEW_NOTIFICATION, payload);
  }

  static emitNotificationRead(userId: string, notificationId: string): void {
    if (!this.isInitialized()) return;
    this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.NOTIFICATION_READ, {
      notificationId,
    });
  }

  static emitNotificationsCleared(userId: string, count: number): void {
    if (!this.isInitialized()) return;
    this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.NOTIFICATIONS_CLEARED, {
      count,
    });
  }

  // ==================== Quota Events ====================

  static emitQuotaUpdated(userId: string, payload: QuotaUpdatedPayload): void {
    if (!this.isInitialized()) return;
    this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.QUOTA_UPDATED, payload);
  }

  static emitQuotaWarning(userId: string, payload: QuotaWarningPayload): void {
    if (!this.isInitialized()) return;
    const event = payload.level === 'critical' 
      ? SocketEvent.QUOTA_EXCEEDED 
      : SocketEvent.QUOTA_WARNING;
    this.getIO().to(SocketRoom.user(userId)).emit(event, payload);
  }

  // ==================== User Presence Events ====================

  static emitUserOnline(userIds: string[], payload: UserOnlinePayload): void {
    if (!this.isInitialized()) return;
    userIds.forEach(userId => {
      this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.USER_ONLINE, payload);
    });
  }

  static emitUserOffline(userIds: string[], payload: UserOnlinePayload): void {
    if (!this.isInitialized()) return;
    userIds.forEach(userId => {
      this.getIO().to(SocketRoom.user(userId)).emit(SocketEvent.USER_OFFLINE, payload);
    });
  }

  // ==================== Utility Methods ====================

  /**
   * Broadcast to all connected clients
   */
  static broadcast(event: SocketEvent, ...args: any[]): void {
    if (!this.isInitialized()) return;
    (this.getIO() as any).emit(event, ...args);
  }

  /**
   * Emit to specific room
   */
  static emitToRoom(room: string, event: SocketEvent, ...args: any[]): void {
    if (!this.isInitialized()) return;
    (this.getIO().to(room) as any).emit(event, ...args);
  }

  /**
   * Get number of connected clients
   */
  static async getConnectedClientsCount(): Promise<number> {
    if (!this.isInitialized()) return 0;
    const sockets = await this.getIO().fetchSockets();
    return sockets.length;
  }

  /**
   * Get connected clients in a room
   */
  static async getClientsInRoom(room: string): Promise<number> {
    if (!this.isInitialized()) return 0;
    const sockets = await this.getIO().in(room).fetchSockets();
    return sockets.length;
  }

  /**
   * Check if user is online
   */
  static async isUserOnline(userId: string): Promise<boolean> {
    if (!this.isInitialized()) return false;
    const count = await this.getClientsInRoom(SocketRoom.user(userId));
    return count > 0;
  }
}
