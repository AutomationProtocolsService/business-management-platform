import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export type NotificationType = 'default' | 'info' | 'success' | 'warning' | 'error';

export type NotificationCategory = 
  | 'customer' 
  | 'project' 
  | 'quote' 
  | 'invoice' 
  | 'survey' 
  | 'installation' 
  | 'employee' 
  | 'timesheet' 
  | 'task'
  | 'system';

export type Notification = {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  category: NotificationCategory;
  entityId?: number;
};

export type WebSocketPayload = {
  id?: number;
  type?: string;
  data?: any;
  message?: string;
  timestamp?: string;
  category?: string;
};

export type NotificationsContextType = {
  notifications: Notification[];
  filteredNotifications: Notification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  unreadCount: number;
  activeFilter: NotificationCategory | 'all';
  setFilter: (filter: NotificationCategory | 'all') => void;
};

const NotificationsContext = createContext<NotificationsContextType | null>(null);

// Key for localStorage
const STORAGE_KEY = 'bms_notifications';

// Helper to parse notifications from localStorage
const getStoredNotifications = (): Notification[] => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      return JSON.parse(storedData);
    }
  } catch (error) {
    console.error('Error loading notifications from localStorage:', error);
  }
  return [];
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(getStoredNotifications);
  const [activeFilter, setActiveFilter] = useState<NotificationCategory | 'all'>('all');
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 3000; // 3 seconds
    
    const connectWebSocket = () => {
      // WebSocket setup
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      socket = new WebSocket(wsUrl);
      
      socket.addEventListener('open', () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        
        // Send user identification
        socket.send(JSON.stringify({ 
          type: 'connect', 
          userId: user.id 
        }));
      });
      
      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      socket.addEventListener('close', (event) => {
        console.log(`WebSocket disconnected with code: ${event.code}`);
        
        // Attempt to reconnect unless it was a clean closure or maximum attempts reached
        if (!event.wasClean && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
        }
      });
      
      socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
      });
      
      setWebsocket(socket);
    };
    
    // Initial connection
    connectWebSocket();
    
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      // Clear any pending reconnect
      clearTimeout(reconnectTimeout);
    };
  }, [user]);
  
  // Save notifications to localStorage
  useEffect(() => {
    if (notifications.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
      } catch (error) {
        console.error('Error saving notifications to localStorage:', error);
      }
    }
  }, [notifications]);
  
  // Get filtered notifications based on active filter
  const filteredNotifications = activeFilter === 'all' 
    ? notifications 
    : notifications.filter(n => n.category === activeFilter);
  
  // Delete a notification
  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);
  
  // Set notification filter
  const setFilter = useCallback((filter: NotificationCategory | 'all') => {
    setActiveFilter(filter);
  }, []);
  
  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (payload: WebSocketPayload) => {
    // Handle notifications for specific events
    if (payload.message) {
      const notificationType = (payload.type || 'default') as NotificationType;
      
      // Determine notification category from event type
      let category: NotificationCategory = 'system';
      let entityId: number | undefined = payload.id;
      
      if (payload.category) {
        category = payload.category as NotificationCategory;
      } else if (typeof payload.type === 'string') {
        // Try to extract category from event type (e.g., 'project:created' -> 'project')
        const parts = payload.type.split(':');
        if (parts.length > 0 && isValidCategory(parts[0])) {
          category = parts[0] as NotificationCategory;
        }
      }
      
      // Add to notifications list
      const newNotification: Notification = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: payload.message,
        type: notificationType,
        timestamp: payload.timestamp || new Date().toISOString(),
        read: false,
        category,
        entityId
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      
      // Show toast notification for immediate visibility
      toast({
        title: getNotificationTitle(notificationType),
        description: payload.message,
        variant: mapNotificationTypeToToastVariant(notificationType),
      });
    }
  };
  
  // Helper to validate category
  const isValidCategory = (category: string): boolean => {
    const validCategories: string[] = [
      'customer', 'project', 'quote', 'invoice', 'survey', 
      'installation', 'employee', 'timesheet', 'task', 'system'
    ];
    return validCategories.includes(category);
  };
  
  const getNotificationTitle = (type: NotificationType): string => {
    switch (type) {
      case 'success': return 'Success';
      case 'error': return 'Error';
      case 'warning': return 'Warning';
      case 'info': return 'Information';
      default: return 'Notification';
    }
  };
  
  const mapNotificationTypeToToastVariant = (type: NotificationType): 'default' | 'destructive' => {
    return type === 'error' ? 'destructive' : 'default';
  };
  
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };
  
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <NotificationsContext.Provider value={{ 
      notifications,
      filteredNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      unreadCount,
      activeFilter,
      setFilter
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};