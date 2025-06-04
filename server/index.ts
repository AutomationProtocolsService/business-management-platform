import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabaseAndMigrations } from "./utils/run-migrations";
import { setupAuth } from "./auth";
import { tenantFilterMiddleware } from "./middleware/tenant-filter";
import { setupUnhandledRejectionHandler } from "./middleware/error-handler";
import { logger } from "./logger";
import { applyErrorHandling } from "./middleware/apply-error-handling";

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
  
  // Initialize authentication system first so routes can access user info
  setupAuth(app);
  
  // Apply tenant middleware only to API routes
  // This prevents the middleware from interfering with frontend resources
  app.use('/api', tenantFilterMiddleware);
  
  // Register API routes after authentication and tenant middleware
  const server = await registerRoutes(app);
  
  // Set up Vite for development or static file serving
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  
  // Apply the centralized error handling
  applyErrorHandling(app);

  // Add global Express error handler for unhandled errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('💥 Unhandled error caught by global handler:', err);
    console.error('💥 Error stack:', err.stack);
    console.error('💥 Request URL:', req.url);
    console.error('💥 Request method:', req.method);
    console.error('💥 Request body:', req.body);
    
    if (res.headersSent) {
      return next(err);
    }
    
    res.status(500).json({ 
      error: err.message, 
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      url: req.url,
      method: req.method
    });
  });

  // Use the port provided by Replit or fall back to 5000
  // This serves both the API and the client
  const port = process.env.PORT || 5000;
  
  // Add a health check endpoint at the root
  app.get("/", (_, res) => {
    res.send("✅ Server is up and running!");
  });

  // Add a health check endpoint for debugging
  app.get("/healthz", async (_, res) => {
    try {
      // Test database connection
      const result = await db.execute("SELECT 1 as test");
      res.json({ 
        status: 'ok', 
        database: 'connected',
        timestamp: new Date().toISOString(),
        result: result.rows
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'error', 
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  server.listen({
    port,
    host: "0.0.0.0", // Bind to all network interfaces, not just localhost
    reusePort: true,
  }, () => {
    log(`Server is listening on http://0.0.0.0:${port}`);
  });
})();
