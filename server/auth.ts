import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import memorystore from "memorystore";
import { db, client } from "./db";
import { storage } from "./storage";
import { User as SelectUser, Tenant as SelectTenant } from "@shared/schema";
import { User } from "@shared/types";
import { logger } from "./logger";
import { hashPassword, comparePasswords, generateSecureToken, calculateTokenExpiry } from "./auth-utils";
import EmailService from "./services/email-service";

declare global {
  namespace Express {
    interface User extends SelectUser {}
    interface Request {
      // Add tenant information to all requests
      tenant?: SelectTenant;
    }
  }
}

/**
 * Set up the authentication system
 */
export function setupAuth(app: Express) {
  // Create a memory store for session data
  const MemoryStore = memorystore(session);
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  });

  // Configure session settings
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "business-management-app-secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  };

  // Trust the first proxy
  app.set("trust proxy", 1);
  
  // Set up session middleware
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Parse tenant from subdomain or header
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Method 1: Extract tenant from subdomain
      const hostname = req.hostname || '';
      let subdomain = null;
      
      // Extract subdomain if possible (e.g., tenant1.example.com)
      if (hostname.includes('.') && !hostname.startsWith('www.')) {
        subdomain = hostname.split('.')[0];
      }
      
      // Method 2: Extract tenant from custom header (useful for local development)
      const tenantHeader = req.headers['x-tenant'] as string;
      
      // Try to find tenant by subdomain or header
      if (subdomain) {
        req.tenant = await storage.getTenantBySubdomain(subdomain);
      } else if (tenantHeader) {
        const tenantId = parseInt(tenantHeader);
        if (!isNaN(tenantId)) {
          req.tenant = await storage.getTenant(tenantId);
        }
      }
      
      // Method 3: Extract tenant from authenticated user if available
      // If the user is already authenticated, add tenant context from user
      if (req.isAuthenticated() && !req.tenant) {
        const user = req.user as User;
        if (user?.tenantId) {
          const userTenant = await storage.getTenant(user.tenantId);
          if (userTenant) {
            req.tenant = userTenant;
            logger.info({ tenantId: user.tenantId, userId: user.id }, "Set tenant from authenticated user");
          }
        }
      }
      
      next();
    } catch (error) {
      logger.error({ err: error }, 'Error determining tenant');
      next();
    }
  });

  // Configure Passport's local strategy with tenant awareness
  passport.use(
    new LocalStrategy({
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true // This allows us to access the request object
    }, async (req: Request, username: string, password: string, done: any) => {
      try {
        logger.info({ username }, "Login attempt");
        
        // If no tenant information is available, we can't authenticate
        if (!req.tenant && !req.body.tenantId) {
          logger.warn({ username }, "Login failed: No tenant information");
          return done(null, false, { message: "Tenant information required" });
        }
        
        // Determine tenant ID from request
        const tenantId = req.tenant?.id || parseInt(req.body.tenantId);
        
        if (isNaN(tenantId)) {
          logger.warn({ username }, "Login failed: Invalid tenant ID");
          return done(null, false, { message: "Invalid tenant ID" });
        }
        
        // Find user by username and tenant ID
        const user = await storage.getUserByUsername(username, tenantId);
        
        if (!user) {
          logger.warn({ username, tenantId }, "Login failed: User not found");
          return done(null, false, { message: "Invalid credentials" });
        }
        
        // Check if passwords match
        const passwordMatch = await comparePasswords(password, user.password);
        
        if (!passwordMatch) {
          logger.warn({ username, tenantId }, "Login failed: Incorrect password");
          return done(null, false, { message: "Invalid credentials" });
        }
        
        // Update last login timestamp
        await storage.updateUser(user.id, { 
          lastLogin: new Date() 
        });
        
        logger.info({ userId: user.id, username, tenantId }, "Login successful");
        return done(null, user);
      } catch (err) {
        logger.error({ err, username }, "Login error");
        return done(err);
      }
    }),
  );

  // Serialize user to session
  passport.serializeUser((user, done) => {
    logger.debug({ userId: user.id }, "Serializing user to session");
    done(null, user.id);
  });
  
  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      logger.debug({ userId: id }, "Deserializing user from session");
      const user = await storage.getUser(id);
      
      if (!user) {
        logger.warn({ userId: id }, "Session user not found");
        return done(null, false);
      }
      
      done(null, user);
    } catch (err) {
      logger.error({ err, userId: id }, "Error deserializing user");
      done(err);
    }
  });

  // User registration endpoint (tenant-aware)
  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password, email, fullName, role, tenantId } = req.body;
      
      // Validate required fields
      if (!username || !password || !email || !fullName) {
        logger.warn({ username, email }, "Registration failed: Missing required fields");
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields" 
        });
      }
      
      // Determine tenant ID (from request body or request tenant)
      const effectiveTenantId = tenantId || req.tenant?.id;
      
      if (!effectiveTenantId) {
        logger.warn({ username, email }, "Registration failed: No tenant specified");
        return res.status(400).json({ 
          success: false, 
          message: "Tenant information required" 
        });
      }
      
      // Check if tenant exists
      const tenant = await storage.getTenant(effectiveTenantId);
      
      if (!tenant) {
        logger.warn({ username, email, tenantId: effectiveTenantId }, "Registration failed: Tenant not found");
        return res.status(400).json({ 
          success: false, 
          message: "Invalid tenant" 
        });
      }
      
      // Check if username is already taken within the tenant
      const existingUser = await storage.getUserByUsername(username, effectiveTenantId);
      
      if (existingUser) {
        logger.warn({ username, tenantId: effectiveTenantId }, "Registration failed: Username already exists");
        return res.status(400).json({ 
          success: false, 
          message: "Username already exists" 
        });
      }

      // Hash the password
      const hashedPassword = await hashPassword(password);
      
      // Create the user with tenant ID
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        fullName,
        role: role || "employee",
        active: true,
        tenantId: effectiveTenantId
      });

      // Remove password from the response
      const { password: _, ...userWithoutPassword } = user;

      logger.info({ userId: user.id, username, tenantId: effectiveTenantId }, "User registered successfully");
      
      // Automatically log in the new user
      req.login(user, (err) => {
        if (err) {
          logger.error({ err, userId: user.id }, "Auto-login failed after registration");
          return next(err);
        }
        res.status(201).json({ 
          success: true,
          user: userWithoutPassword 
        });
      });
    } catch (error) {
      logger.error({ err: error }, "Registration error");
      res.status(500).json({ 
        success: false, 
        message: "An error occurred during registration" 
      });
      next(error);
    }
  });

  // User login endpoint
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    logger.info({ username: req.body?.username }, "Login request received");
    
    // Validate request body
    if (!req.body || !req.body.username || !req.body.password) {
      logger.warn({}, "Login failed: Missing username or password");
      return res.status(400).json({ 
        success: false, 
        message: "Username and password are required" 
      });
    }
    
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: { message: string } | undefined) => {
      if (err) {
        logger.error({ err }, "Login authentication error");
        return res.status(500).json({ 
          success: false, 
          message: "Authentication error" 
        });
      }
      
      if (!user) {
        logger.warn({ username: req.body.username }, "Login failed: Invalid credentials");
        return res.status(401).json({ 
          success: false, 
          message: info?.message || "Invalid credentials" 
        });
      }
      
      req.login(user, (err: Error | null) => {
        if (err) {
          logger.error({ err, userId: user.id }, "Login session error");
          return res.status(500).json({ 
            success: false, 
            message: "Session error" 
          });
        }
        
        // Store user_id and tenant_id in session
        if (req.session) {
          (req.session as any).user_id = user.id;
          (req.session as any).tenant_id = user.tenantId;
        }
        
        // Remove password from the response
        const { password, ...userWithoutPassword } = user;
        
        logger.info({ userId: user.id, username: user.username, tenantId: user.tenantId }, "Login successful");
        res.status(200).json({ 
          success: true,
          user: userWithoutPassword 
        });
      });
    })(req, res, next);
  });

  // User logout endpoint
  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
      const { id, username, tenantId } = req.user as SelectUser;
      logger.info({ userId: id, username, tenantId }, "Logout request");
    }
    
    req.logout((err: Error | null) => {
      if (err) {
        logger.error({ err }, "Logout error");
        return next(err);
      }
      logger.info({}, "Logout successful");
      res.status(200).json({ 
        success: true, 
        message: "Logged out successfully" 
      });
    });
  });

  // Get current user endpoint
  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      logger.debug({}, "Get current user: Not authenticated");
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated" 
      });
    }
    
    // Remove password from the response
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    
    logger.debug({ userId: userWithoutPassword.id }, "Current user information retrieved");
    res.json({ 
      success: true,
      user: userWithoutPassword 
    });
  });

  // Password reset request endpoint
  app.post("/api/auth/request-password-reset", async (req: Request, res: Response) => {
    try {
      const { email, username, tenantId } = req.body;
      
      if (!email || !username || !tenantId) {
        logger.warn({}, "Password reset request failed: Missing required fields");
        return res.status(400).json({ 
          success: false, 
          message: "Email, username, and tenant information are required" 
        });
      }
      
      // Determine tenant ID (from request body or request tenant)
      const effectiveTenantId = parseInt(tenantId) || req.tenant?.id;
      
      if (!effectiveTenantId) {
        logger.warn({ email }, "Password reset request failed: No tenant specified");
        return res.status(400).json({ 
          success: false, 
          message: "Tenant information required" 
        });
      }
      
      // Get tenant for company name and validation
      const tenant = await storage.getTenant(effectiveTenantId);
      if (!tenant) {
        logger.warn({ email, tenantId: effectiveTenantId }, "Password reset request failed: Invalid tenant");
        // For security, don't reveal that the tenant doesn't exist
        return res.json({ 
          success: true,
          message: "If your email is registered, you will receive password reset instructions" 
        });
      }
      
      // Find user by username and tenant
      const user = await storage.getUserByUsername(username, effectiveTenantId);
      
      // Generate and store token if the user exists and email matches
      if (user && user.email.toLowerCase() === email.toLowerCase()) {
        // Generate a secure token
        const token = generateSecureToken();
        const expiryDate = calculateTokenExpiry();
        
        // Store the token in the database
        await storage.createPasswordResetToken({
          userId: user.id,
          tenantId: effectiveTenantId,
          token,
          expiresAt: expiryDate,
          used: false
        });
        
        // Generate reset URL
        const baseUrl = process.env.APP_URL || `http://${req.get('host')}`;
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;
        
        // Get the from email address
        const fromEmail = process.env.EMAIL_FROM || "noreply@example.com";
        
        // Send the password reset email
        await EmailService.sendPasswordResetEmail(
          user.email,
          token,
          resetUrl,
          fromEmail,
          {
            companyName: tenant.companyName || tenant.name,
          }
        );
        
        logger.info({ 
          userId: user.id, 
          email: user.email, 
          tenantId: effectiveTenantId,
          tokenExpiry: expiryDate
        }, "Password reset email sent");
      } else {
        logger.warn({ 
          providedEmail: email, 
          providedUsername: username, 
          tenantId: effectiveTenantId 
        }, "Password reset requested for non-existent user or email mismatch");
      }
      
      // Always return success even if email doesn't exist (security best practice)
      res.json({ 
        success: true,
        message: "If your email is registered, you will receive password reset instructions" 
      });
    } catch (error) {
      logger.error({ err: error }, "Password reset request error");
      res.status(500).json({ 
        success: false, 
        message: "An error occurred processing your request" 
      });
    }
  });

  // Password reset execution endpoint
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password, confirmPassword } = req.body;
      
      if (!token || !password) {
        logger.warn({}, "Password reset execution failed: Missing token or password");
        return res.status(400).json({ 
          success: false, 
          message: "Token and password are required" 
        });
      }
      
      if (password !== confirmPassword) {
        logger.warn({}, "Password reset execution failed: Passwords don't match");
        return res.status(400).json({ 
          success: false, 
          message: "Passwords do not match" 
        });
      }
      
      // Find the token in the database
      const resetToken = await storage.getPasswordResetTokenByToken(token);
      
      if (!resetToken) {
        logger.warn({ token: token.substring(0, 8) + '...' }, "Password reset execution failed: Token not found");
        return res.status(400).json({ 
          success: false, 
          message: "Invalid or expired token" 
        });
      }
      
      // Check if token is already used
      if (resetToken.used) {
        logger.warn({ tokenId: resetToken.id }, "Password reset execution failed: Token already used");
        return res.status(400).json({ 
          success: false, 
          message: "This reset link has already been used" 
        });
      }
      
      // Check if token is expired
      if (new Date() > new Date(resetToken.expiresAt)) {
        logger.warn({ 
          tokenId: resetToken.id, 
          expiry: resetToken.expiresAt 
        }, "Password reset execution failed: Token expired");
        return res.status(400).json({ 
          success: false, 
          message: "This reset link has expired" 
        });
      }
      
      // Find the user associated with the token
      const user = await storage.getUser(resetToken.userId);
      
      if (!user) {
        logger.warn({ 
          tokenId: resetToken.id, 
          userId: resetToken.userId 
        }, "Password reset execution failed: User not found");
        return res.status(400).json({ 
          success: false, 
          message: "User not found" 
        });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(password);
      
      // Update the user's password
      await storage.updateUser(user.id, { password: hashedPassword });
      
      // Mark the token as used
      await storage.invalidatePasswordResetToken(token);
      
      logger.info({ 
        userId: user.id, 
        username: user.username, 
        tokenId: resetToken.id 
      }, "Password reset successful");
      
      res.json({ 
        success: true, 
        message: "Password has been reset successfully" 
      });
    } catch (error) {
      logger.error({ err: error }, "Password reset execution error");
      res.status(500).json({ 
        success: false, 
        message: "An error occurred resetting your password" 
      });
    }
  });

  // Middleware to check role-based access
  app.use('/api/admin/*', (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      logger.warn({}, "Admin access denied: Not authenticated");
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }
    
    const user = req.user as SelectUser;
    if (user.role !== 'admin') {
      logger.warn({ userId: user.id, role: user.role }, "Admin access denied: Insufficient permissions");
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required" 
      });
    }
    
    logger.debug({ userId: user.id, role: user.role }, "Admin access granted");
    next();
  });

  // Middleware for manager-level access
  app.use('/api/manager/*', (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      logger.warn({}, "Manager access denied: Not authenticated");
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }
    
    const user = req.user as SelectUser;
    if (user.role !== 'admin' && user.role !== 'manager') {
      logger.warn({ userId: user.id, role: user.role }, "Manager access denied: Insufficient permissions");
      return res.status(403).json({ 
        success: false, 
        message: "Manager access required" 
      });
    }
    
    logger.debug({ userId: user.id, role: user.role }, "Manager access granted");
    next();
  });
}
