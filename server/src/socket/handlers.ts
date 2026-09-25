import { Server as SocketIOServer } from 'socket.io';
import {
  AuthenticatedSocket,
  SocketEvent,
  SocketRoom,
  JoinRoomPayload,
  LeaveRoomPayload,
  UserTypingPayload,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket.types';

/**
 * Setup Socket.IO event handlers
 */
export const setupSocketHandlers = (
  io: SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >
): void => {
  io.on(SocketEvent.CONNECTION, (socket: AuthenticatedSocket) => {
    console.log(`✅ Socket connected: ${socket.id} (User: ${socket.user?.username})`);

    // Join user's personal room automatically
    if (socket.userId) {
      socket.join(SocketRoom.user(socket.userId));
      console.log(`👤 User ${socket.user?.username} joined room: ${SocketRoom.user(socket.userId)}`);
    }

    // Handle JOIN_ROOM event
    socket.on(SocketEvent.JOIN_ROOM, (payload: JoinRoomPayload, callback) => {
      try {
        socket.join(payload.room);
        console.log(`🚪 User ${socket.user?.username} joined room: ${payload.room}`);
        
        if (callback) {
          callback(true);
        }
      } catch (error) {
        console.error('Error joining room:', error);
        if (callback) {
          callback(false);
        }
      }
    });

    // Handle LEAVE_ROOM event
    socket.on(SocketEvent.LEAVE_ROOM, (payload: LeaveRoomPayload, callback) => {
      try {
        socket.leave(payload.room);
        console.log(`🚪 User ${socket.user?.username} left room: ${payload.room}`);
        
        if (callback) {
          callback(true);
        }
      } catch (error) {
        console.error('Error leaving room:', error);
        if (callback) {
          callback(false);
        }
      }
    });

    // Handle USER_TYPING event (broadcast to others in the room)
    socket.on(SocketEvent.USER_TYPING, (payload: UserTypingPayload) => {
      try {
        const room = payload.resourceType === 'file'
          ? SocketRoom.file(payload.resourceId)
          : SocketRoom.folder(payload.resourceId);
        
        // Broadcast to others in the room (exclude sender)
        socket.to(room).emit(SocketEvent.USER_TYPING, payload);
      } catch (error) {
        console.error('Error broadcasting typing event:', error);
      }
    });

    // Handle DISCONNECT event
    socket.on(SocketEvent.DISCONNECT, (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id} (User: ${socket.user?.username}, Reason: ${reason})`);
      
      // Could emit user offline event here
      // SocketService.emitUserOffline([...], { userId, username, timestamp })
    });

    // Handle ERROR event
    socket.on(SocketEvent.ERROR, (error) => {
      console.error(`⚠️ Socket error for ${socket.id}:`, error);
    });
  });

  // Handle connection errors
  io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', err);
  });

  console.log('✅ Socket.IO handlers initialized');
};
