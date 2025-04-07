import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { log } from './vite';

// Define event types
export type WebSocketEvent = 
  | 'customer:created'
  | 'customer:updated'
  | 'customer:deleted'
  | 'project:created'
  | 'project:updated'
  | 'project:deleted'
  | 'quote:created'
  | 'quote:updated'
  | 'quote:deleted'
  | 'invoice:created'
  | 'invoice:updated'
  | 'invoice:deleted'
  | 'survey:created'
  | 'survey:updated'
  | 'survey:deleted'
  | 'installation:created'
  | 'installation:updated'
  | 'installation:deleted'
  | 'employee:created'
  | 'employee:updated'
  | 'employee:deleted'
  | 'timesheet:created'
  | 'timesheet:updated'
  | 'timesheet:deleted'
  | 'task:created'
  | 'task:updated'
  | 'task:deleted'
  | 'catalog-item:created'
  | 'catalog-item:updated'
  | 'catalog-item:deleted'
  | 'supplier:created'
  | 'supplier:updated'
  | 'supplier:deleted'
  | 'expense:created'
  | 'expense:updated'
  | 'expense:deleted'
  | 'purchase-order:created'
  | 'purchase-order:updated'
  | 'purchase-order:deleted'
  | 'inventory:created'
  | 'inventory:updated'
  | 'inventory:deleted'
  | 'inventory-transaction:created'
  | 'settings:updated'
  | 'notification';

// Define payload types
export interface WebSocketPayload {
  id?: number;
  type?: string;
  data?: any;
  message?: string;
  timestamp?: string;
}

// Class to manage WebSocket connections and events
export class WebSocketManager {
  private io: Server;
  private connections: Map<string, Socket> = new Map();
  private userTenants: Map<string, number> = new Map(); // Map user IDs to tenant IDs

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupSocketHandlers();
    log('WebSocket server initialized', 'websocket');
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.handshake.query.userId as string;
      const tenantId = socket.handshake.query.tenantId as string;
      
      if (userId) {
        this.connections.set(userId, socket);
        log(`User ${userId} connected`, 'websocket');
        
        // Store tenant association if provided
        if (tenantId) {
          this.userTenants.set(userId, parseInt(tenantId, 10));
          // Join tenant-specific room
          const tenantRoom = `tenant-${tenantId}`;
          socket.join(tenantRoom);
          log(`User ${userId} joined tenant room ${tenantRoom}`, 'websocket');
        }
        
        // Handle user roles and channels
        socket.on('join', (channels: string[]) => {
          if (Array.isArray(channels)) {
            channels.forEach(channel => {
              socket.join(channel);
              log(`User ${userId} joined channel ${channel}`, 'websocket');
            });
          }
        });
        
        // Handle user disconnection
        socket.on('disconnect', () => {
          this.connections.delete(userId);
          this.userTenants.delete(userId);
          log(`User ${userId} disconnected`, 'websocket');
        });
      } else {
        log('Anonymous connection detected', 'websocket');
        socket.disconnect();
      }
    });
  }

  // Broadcast an event to all connected clients
  public broadcast(event: WebSocketEvent, payload: WebSocketPayload) {
    this.io.emit(event, payload);
    log(`Broadcast event: ${event}`, 'websocket');
  }

  // Send an event to a specific user
  public sendToUser(userId: string, event: WebSocketEvent, payload: WebSocketPayload) {
    const socket = this.connections.get(userId);
    if (socket) {
      socket.emit(event, payload);
      log(`Sent event ${event} to user ${userId}`, 'websocket');
    }
  }

  // Send an event to a specific channel/room
  public sendToChannel(channel: string, event: WebSocketEvent, payload: WebSocketPayload) {
    this.io.to(channel).emit(event, payload);
    log(`Sent event ${event} to channel ${channel}`, 'websocket');
  }
  
  // Broadcast to all users in a specific tenant
  public broadcastToTenant(tenantId: number, event: WebSocketEvent, payload: WebSocketPayload) {
    const tenantRoom = `tenant-${tenantId}`;
    this.io.to(tenantRoom).emit(event, payload);
    log(`Broadcast event ${event} to tenant ${tenantId}`, 'websocket');
  }
  
  // Send a system notification to all users in a tenant
  public notifyTenant(tenantId: number, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const payload: WebSocketPayload = {
      message,
      type,
      timestamp: new Date().toISOString(),
      category: 'system'
    };
    
    this.broadcastToTenant(tenantId, 'notification', payload);
  }
  
  // Send a system notification to a specific user
  public notifyUser(userId: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const payload: WebSocketPayload = {
      message,
      type,
      timestamp: new Date().toISOString(),
      category: 'system'
    };
    
    this.sendToUser(userId, 'notification', payload);
  }
}

let websocketManager: WebSocketManager | null = null;

// Initialize WebSocket server
export function setupWebSocketServer(httpServer: HttpServer): WebSocketManager {
  if (!websocketManager) {
    websocketManager = new WebSocketManager(httpServer);
  }
  return websocketManager;
}

// Get the WebSocket manager instance
export function getWebSocketManager(): WebSocketManager | null {
  return websocketManager;
}