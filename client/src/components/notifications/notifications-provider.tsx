import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

type NotificationType = 'default' | 'info' | 'success' | 'warning' | 'error';

type Notification = {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
};

type WebSocketPayload = {
  id?: number;
  type?: string;
  data?: any;
  message?: string;
  timestamp?: string;
};

type NotificationsContextType = {
  notifications: Notification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
};

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    // WebSocket setup
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.addEventListener('open', () => {
      console.log('WebSocket connected');
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
    
    socket.addEventListener('close', () => {
      console.log('WebSocket disconnected');
    });
    
    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    setWebsocket(socket);
    
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [user]);
  
  const handleWebSocketMessage = (payload: WebSocketPayload) => {
    // Handle notifications for specific events
    if (payload.message) {
      const notificationType = (payload.type || 'default') as NotificationType;
      
      // Add to notifications list
      const newNotification: Notification = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: payload.message,
        type: notificationType,
        timestamp: payload.timestamp || new Date().toISOString(),
        read: false
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
    <NotificationsContext.Provider value={{ notifications, markAsRead, markAllAsRead, unreadCount }}>
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