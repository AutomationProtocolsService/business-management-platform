import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabaseAndMigrations } from "./utils/run-migrations";
import { setupAuth } from "./auth";
import tenantMiddleware from "./middleware/tenant-filter";
import { errorHandler, setupUnhandledRejectionHandler } from "./middleware/error-handler";
import { logger } from "./logger";

// Set up global handler for uncaught promise rejections
setupUnhandledRejectionHandler();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Capture the response for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Add a unique identifier to each request for tracing
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId as string;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);

      // Log more detailed information for non-2xx responses
      if (res.statusCode >= 400) {
        logger.warn({
          message: `${req.method} ${path} failed with status ${res.statusCode}`,
          requestId,
          duration,
          statusCode: res.statusCode,
          response: capturedJsonResponse,
          userId: req.user?.id || 'anonymous',
          tenantId: (req as any).tenant?.id || 'none'
        });
      }
    }
  });

  next();
});

(async () => {
  try {
    // Run database migrations before starting the server
    await initializeDatabaseAndMigrations();
    console.log("Database migrations completed successfully");
  } catch (error) {
    console.error("Error running database migrations:", error);
    // Continue starting the server even if migrations fail
  }
  
  // Set up Vite first for development or static file serving
  // This ensures all frontend routes work before any API middleware
  const server = await registerRoutes(app);
  
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  
  // Initialize authentication system
  setupAuth(app);
  
  // Apply tenant middleware only to API routes
  // This prevents the middleware from interfering with frontend resources
  app.use('/api', tenantMiddleware);

  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    return res.status(404).json({
      message: `API endpoint not found: ${req.originalUrl}`,
      code: 'NOT_FOUND'
    });
  });

  // Global error handler middleware
  app.use(errorHandler);

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
