import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import { swaggerSpec } from "./config/swagger";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import folderRoutes from "./routes/folder.routes";
import fileRoutes from "./routes/file.routes";
import storageRoutes from "./routes/storage.routes";
import permissionRoutes from "./routes/permission.routes";
import groupRoutes from "./routes/group.routes";
import shareRoutes from "./routes/share.routes";
import invitationRoutes from "./routes/invitation.routes";
import { errorHandler } from "./middlewares/errorHandler";
import { notFound } from "./middlewares/notFound";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

// API v1 routes
app.use("/api/v1", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/folders", folderRoutes);
app.use("/api/v1/files", fileRoutes);
app.use("/api/v1/storage", storageRoutes);
app.use("/api/v1/permissions", permissionRoutes);
app.use("/api/v1/groups", groupRoutes);
app.use("/api/v1/shares", shareRoutes);
app.use("/api/v1/invitations", invitationRoutes);

// 404 & Global Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;