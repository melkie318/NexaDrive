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
import trashRoutes from "./routes/trash.routes";
import versionRoutes from "./routes/version.routes";
import zipRoutes from "./routes/zip.routes";
import searchRoutes from "./routes/search.routes";
import activityRoutes from "./routes/activity.routes";
import notificationRoutes from "./routes/notification.routes";
import adminRoutes from "./routes/admin.routes";
import planRoutes from "./routes/plan.routes";
import paymentRoutes from "./routes/payment.routes";
import subscriptionRoutes from "./routes/subscription.routes";
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
app.use("/api/v1/trash", trashRoutes);
app.use("/api/v1", versionRoutes);
app.use("/api/v1/zip", zipRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/activities", activityRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/plans", planRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);

// 404 & Global Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;