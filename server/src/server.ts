import dotenv from "dotenv";
import { createServer } from 'http';
import app from './app';
import { initializeSocketIO } from './config/socket';
import { socketAuthMiddleware } from './middlewares/socket.middleware';
import { setupSocketHandlers } from './socket/handlers';
import { SocketService } from './services/socket.service';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocketIO(httpServer);

// Setup Socket.IO authentication middleware
io.use(socketAuthMiddleware);

// Initialize SocketService with io instance
SocketService.initialize(io);

// Setup Socket.IO event handlers
setupSocketHandlers(io);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 NexaDrive API running on http://localhost:${PORT}`);
  console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
  console.log(`🔌 Socket.IO server ready`);
});

process.on('unhandledRejection', (reason: Error) => {
  console.error('Unhandled Rejection at:', reason.stack || reason);
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception thrown:', error.stack || error);
  process.exit(1);
});

export default httpServer;
