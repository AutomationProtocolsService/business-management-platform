import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';
import { io, Socket } from 'socket.io-client';

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
  | 'catalog-item'
  | 'supplier'
  | 'expense'
  | 'purchase-order'
  | 'inventory'
  | 'inventory-transaction'
  | 'settings'
  | 'system';

export type Notification = {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  category: NotificationCategory;
  entityId?: number;
  duration?: number;
  url?: string;
};

export type WebSocketPayload = {
  id?: number;
  type?: string;
  data?: any;
  message?: string;
  timestamp?: string;
  category?: string;
  duration?: number;
  url?: string;
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

// WebSocket event types that we're interested in
const NOTIFICATION_EVENTS = [
  'notification',
  'customer:created', 'customer:updated', 'customer:deleted',
  'project:created', 'project:updated', 'project:deleted',
  'quote:created', 'quote:updated', 'quote:deleted',
  'invoice:created', 'invoice:updated', 'invoice:deleted',
  'survey:created', 'survey:updated', 'survey:deleted',
  'installation:created', 'installation:updated', 'installation:deleted',
  'employee:created', 'employee:updated', 'employee:deleted',
  'timesheet:created', 'timesheet:updated', 'timesheet:deleted',
  'task:created', 'task:updated', 'task:deleted',
  'catalog-item:created', 'catalog-item:updated', 'catalog-item:deleted',
  'supplier:created', 'supplier:updated', 'supplier:deleted',
  'expense:created', 'expense:updated', 'expense:deleted',
  'purchase-order:created', 'purchase-order:updated', 'purchase-order:deleted',
  'inventory:created', 'inventory:updated', 'inventory:deleted',
  'inventory-transaction:created',
  'settings:updated'
];

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(getStoredNotifications);
  const [activeFilter, setActiveFilter] = useState<NotificationCategory | 'all'>('all');
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenant } = useTenant();
  
  useEffect(() => {
    // Only initialize socket if we have both user and tenant
    if (!user || !tenant?.id) return;
    
    // Prevent socket reconnection if already connected
    if (socketRef.current) {
      // Check if we need to reconnect with new tenant ID
      try {
        const currentQuery = socketRef.current.io?.opts?.query;
        const currentTenantId = currentQuery && typeof currentQuery === 'object' ? 
          (currentQuery as Record<string, unknown>).tenantId : undefined;
          
        if (currentTenantId !== tenant.id.toString()) {
          console.log('Tenant changed, reconnecting socket');
          socketRef.current.disconnect();
          socketRef.current = null;
        } else {
          // Already connected with correct tenant
          return;
        }
      } catch (error) {
        console.error('Error checking socket query:', error);
        // Reconnect to be safe
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      }
    }
    
    console.log('Initializing socket connection');
    
    try {
      // Get the Socket.IO client instance
      socketRef.current = io('/', {
        query: {
          userId: user.id.toString(),
          tenantId: tenant.id.toString()
        },
        transports: ['websocket', 'polling'],
        autoConnect: true
      });
      
      const socket = socketRef.current;
      
      // Connection events
      socket.on('connect', () => {
        console.log('Socket.IO connected, socket ID:', socket.id);
        setSocketConnected(true);
        
        // Join room for tenant-specific notifications
        socket.emit('join', [`tenant-${tenant.id}`]);
      });
      
      socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
        setSocketConnected(false);
      });
      
      socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        setSocketConnected(false);
      });
      
      // Subscribe to all notification events
      NOTIFICATION_EVENTS.forEach(eventType => {
        socket.on(eventType, (payload: WebSocketPayload) => {
          handleSocketEvent(eventType, payload);
        });
      });
    } catch (error) {
      console.error('Error initializing Socket.IO:', error);
    }
    
    // Cleanup when component unmounts or dependencies change
    return () => {
      if (socketRef.current) {
        console.log('Disconnecting socket');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id, tenant?.id]); // Only re-run if user ID or tenant ID changes
  
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
  
  // Handle incoming socket events
  const handleSocketEvent = useCallback((eventType: string, payload: WebSocketPayload) => {
    // Only process events with message content
    if (payload.message) {
      const notificationType = (payload.type || 'default') as NotificationType;
      
      // Determine notification category from event type
      let category: NotificationCategory = 'system';
      let entityId: number | undefined = payload.id;
      
      if (payload.category) {
        category = payload.category as NotificationCategory;
      } else if (eventType !== 'notification') {
        // Try to extract category from event type (e.g., 'project:created' -> 'project')
        const parts = eventType.split(':');
        if (parts.length > 0 && isValidCategory(parts[0])) {
          category = parts[0] as NotificationCategory;
        }
      }
      
      // Create a URL for the notification if we have an ID and category
      let url: string | undefined = payload.url;
      if (!url && entityId) {
        switch (category) {
          case 'customer':
            url = `/customers/${entityId}`;
            break;
          case 'project':
            url = `/projects/${entityId}`;
            break;
          case 'invoice':
            url = `/invoices/${entityId}`;
            break;
          case 'quote':
            url = `/quotes/${entityId}`;
            break;
          case 'task':
            url = `/tasks/${entityId}`;
            break;
          // ... add more URL mappings as needed
        }
      }
      
      // Add to notifications list
      const newNotification: Notification = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        message: payload.message,
        type: notificationType,
        timestamp: payload.timestamp || new Date().toISOString(),
        read: false,
        category,
        entityId,
        duration: payload.duration,
        url
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      
      // Show toast notification for immediate visibility
      toast({
        title: getNotificationTitle(notificationType, category),
        description: payload.message,
        variant: mapNotificationTypeToToastVariant(notificationType),
        duration: payload.duration || 5000
      });
    }
  }, [toast]);
  
  // Helper to validate category
  const isValidCategory = (category: string): boolean => {
    const validCategories: string[] = [
      'customer', 'project', 'quote', 'invoice', 'survey', 
      'installation', 'employee', 'timesheet', 'task', 'system',
      'catalog-item', 'supplier', 'expense', 'purchase-order',
      'inventory', 'inventory-transaction', 'settings'
    ];
    return validCategories.includes(category);
  };
  
  const getNotificationTitle = (type: NotificationType, category: NotificationCategory): string => {
    // First determine by notification type
    let title: string;
    switch (type) {
      case 'success': title = 'Success'; break;
      case 'error': title = 'Error'; break;
      case 'warning': title = 'Warning'; break;
      case 'info': title = 'Information'; break;
      default: title = 'Notification';
    }
    
    // For system notifications, use the default title based on type
    if (category !== 'system') {
      // Capitalize and format the category name
      const formattedCategory = category
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
        
      title = `${formattedCategory} ${title}`;
    }
    
    return title;
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

// Define a separate type that includes the showNotification method
export type NotificationsHookResult = NotificationsContextType & {
  showNotification: (notification: { 
    message: string;
    type: NotificationType;
    category?: NotificationCategory;
    entityId?: number;
    duration?: number;
    url?: string;
  }) => string;
};

// Create the hook as a named function for better compatibility with Fast Refresh
export const useNotifications = (): NotificationsHookResult => {
  const context = useContext(NotificationsContext);
  
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  
  const showNotification = (notification: { 
    message: string;
    type: NotificationType;
    category?: NotificationCategory;
    entityId?: number;
    duration?: number;
    url?: string;
  }): string => {
    // Create a new notification object
    const newNotification: Notification = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      message: notification.message,
      type: notification.type,
      timestamp: new Date().toISOString(),
      read: false,
      category: notification.category || 'system',
      entityId: notification.entityId,
      duration: notification.duration,
      url: notification.url
    };
    
    // Add the notification to the state
    const notifications = [...context.notifications];
    notifications.unshift(newNotification);
    
    // Return the notification ID
    return newNotification.id;
  };
  
  return {
    ...context,
    showNotification
  };
}