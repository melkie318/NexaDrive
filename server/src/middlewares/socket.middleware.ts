import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../lib/prisma';
import { AuthenticatedSocket } from '../types/socket.types';

/**
 * Socket.IO authentication middleware
 * Verifies JWT token and attaches user to socket
 */
export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: ExtendedError) => void
) => {
  try {
    // Extract token from handshake auth or query
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      (socket.handshake.query?.token as string);

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = verifyAccessToken(token);

    if (!decoded || !decoded.id) {
      return next(new Error('Invalid or expired token'));
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      return next(new Error('User not found'));
    }

    if (!user.isActive) {
      return next(new Error('Account is suspended'));
    }

    // Attach user to socket
    const authSocket = socket as AuthenticatedSocket;
    authSocket.userId = user.id;
    authSocket.user = user;

    // Set socket data
    socket.data.userId = user.id;
    socket.data.username = user.username;
    socket.data.connectedAt = new Date();

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};
