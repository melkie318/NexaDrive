import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "NexaDrive API",
      version: "1.0.0",
      description:
        "REST API for the NexaDrive file storage and management platform",
    },

    servers: [
      {
        url: "http://localhost:5000",
        description: "Local development server",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT access token",
        },
      },
    },

    tags: [
      {
        name: "Health",
        description: "API health check",
      },
      {
        name: "Authentication",
        description:
          "User registration, login, OAuth (Google & GitHub), token refresh, and password management",
      },
      {
        name: "Users",
        description: "User profile and account management",
      },
      {
        name: "Folders",
        description: "Folder CRUD, nesting, and visibility management",
      },
      {
        name: "Files",
        description: "File upload, download, metadata, and visibility management",
      },
      {
        name: "Versions",
        description: "File version history, restore, and rollback",
      },
      {
        name: "Sharing",
        description: "Direct file and folder sharing with users and groups",
      },
      {
        name: "Invitations",
        description: "Email-based sharing invitations with acceptance workflow",
      },
      {
        name: "Public Links",
        description:
          "Password-protected public links with expiry and download limits",
      },
      {
        name: "Groups",
        description: "Group creation, membership, and group-based permissions",
      },
      {
        name: "Permissions",
        description:
          "Role-based resource permissions (Owner, Manager, Editor, Contributor, Viewer, Custom)",
      },
      {
        name: "Trash",
        description: "Soft-delete, restore, and permanent deletion of files and folders",
      },
      {
        name: "ZIP",
        description: "ZIP compression and extraction operations",
      },
      {
        name: "Search",
        description: "Search files and folders with advanced filters, type categories, and special queries",
      },
      {
        name: "Activities",
        description: "User activity logs and history tracking",
      },
      {
        name: "Notifications",
        description: "User notifications for shares, downloads, quota alerts, and invitations",
      },
      {
        name: "Storage Plans",
        description: "Available storage plans and pricing (Free, Premium, Business)",
      },
      {
        name: "Subscriptions",
        description: "User subscription lifecycle management",
      },
      {
        name: "Payments",
        description: "Payment processing via Chapa and Telebirr",
      },
      {
        name: "Activities",
        description: "User activity logs and audit trail",
      },
      {
        name: "Notifications",
        description:
          "User notifications for shares, downloads, quota alerts, and invitations",
      },
      {
        name: "Admin",
        description:
          "Administrator-only endpoints for user management, system monitoring, and platform administration",
      },
    ],
  },

  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
