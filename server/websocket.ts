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
      
      if (userId) {
        this.connections.set(userId, socket);
        log(`User ${userId} connected`, 'websocket');
        
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