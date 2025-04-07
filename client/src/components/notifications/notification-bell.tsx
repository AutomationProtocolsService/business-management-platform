import React, { useEffect, useRef, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useNotifications, NotificationCategory, Notification } from './notifications-provider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { format, isToday, isYesterday } from 'date-fns';
import { useLocation } from 'wouter';

// Get category icon and color based on notification category
const getCategoryConfig = (category: NotificationCategory) => {
  const defaultColor = 'bg-primary text-primary-foreground';
  const warningColor = 'bg-yellow-500 text-white';
  const infoColor = 'bg-blue-500 text-white';
  const successColor = 'bg-green-500 text-white';
  
  switch (category) {
    case 'invoice':
      return { name: 'Invoice', color: infoColor };
    case 'quote':
      return { name: 'Quote', color: infoColor };
    case 'customer':
      return { name: 'Customer', color: infoColor };
    case 'project':
      return { name: 'Project', color: successColor };
    case 'task':
      return { name: 'Task', color: warningColor };
    default:
      return { name: formatCategoryName(category), color: defaultColor };
  }
};

// Format category name for display
const formatCategoryName = (category: string): string => {
  return category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Format notification date for display
const formatNotificationDate = (dateString: string): string => {
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return `Today, ${format(date, 'h:mm a')}`;
  } else if (isYesterday(date)) {
    return `Yesterday, ${format(date, 'h:mm a')}`;
  } else {
    return format(date, 'MMM d, yyyy h:mm a');
  }
};

// Group notifications by date
const groupByDate = (notifications: Notification[]) => {
  const grouped: { [key: string]: Notification[] } = {};
  
  notifications.forEach(notification => {
    const date = new Date(notification.timestamp);
    let key: string;
    
    if (isToday(date)) {
      key = 'Today';
    } else if (isYesterday(date)) {
      key = 'Yesterday';
    } else {
      key = format(date, 'MMM d, yyyy');
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    
    grouped[key].push(notification);
  });
  
  return grouped;
};

// Individual notification item component
const NotificationItem = ({ notification, onClose }: { notification: Notification, onClose: () => void }) => {
  const { markAsRead, deleteNotification } = useNotifications();
  const [_, navigate] = useLocation();
  const categoryConfig = getCategoryConfig(notification.category);
  
  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.url) {
      navigate(notification.url);
      onClose();
    }
  };
  
  return (
    <div 
      className={cn(
        "flex items-start gap-2 p-3 cursor-pointer rounded-md transition-colors",
        notification.read ? "bg-background" : "bg-accent",
        notification.url && "hover:bg-accent"
      )}
      onClick={handleClick}
    >
      <div className="flex-shrink-0">
        <Badge className={cn("h-6 w-auto", categoryConfig.color)}>
          {categoryConfig.name}
        </Badge>
      </div>
      
      <div className="flex-1 space-y-1">
        <p className={cn("text-sm leading-tight", !notification.read && "font-medium")}>
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatNotificationDate(notification.timestamp)}
        </p>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0 rounded-full opacity-70 hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          deleteNotification(notification.id);
        }}
      >
        <X className="h-3 w-3" />
        <span className="sr-only">Dismiss</span>
      </Button>
    </div>
  );
};

// Filter menu component
const NotificationFilterMenu = () => {
  const { activeFilter, setFilter } = useNotifications();
  
  const filters: Array<{ value: NotificationCategory | 'all', label: string }> = [
    { value: 'all', label: 'All Notifications' },
    { value: 'system', label: 'System' },
    { value: 'customer', label: 'Customers' },
    { value: 'project', label: 'Projects' },
    { value: 'quote', label: 'Quotes' },
    { value: 'invoice', label: 'Invoices' },
    { value: 'task', label: 'Tasks' },
  ];
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          Filter: {activeFilter === 'all' ? 'All' : formatCategoryName(activeFilter)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Filter By</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {filters.map((filter) => (
          <DropdownMenuItem 
            key={filter.value}
            className={cn(activeFilter === filter.value && "font-medium bg-accent")}
            onClick={() => setFilter(filter.value)}
          >
            {filter.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Main notification bell component
export function NotificationBell() {
  const { notifications, filteredNotifications, unreadCount, markAllAsRead, clearAllNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const groupedNotifications = groupByDate(filteredNotifications);
  
  // Close on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [open]);
  
  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && open) {
        setOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-9 w-9 rounded-full"
          aria-label="Notifications"
        >
          <BellRing className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0"
              variant="destructive"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        ref={popoverRef}
        className="w-[380px] p-0" 
        align="end" 
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h4 className="font-medium text-base">Notifications</h4>
          <div className="flex items-center gap-2">
            <NotificationFilterMenu />
          </div>
        </div>
        
        <div className="flex items-center justify-between px-4 pb-2 text-xs text-muted-foreground">
          <div>
            {filteredNotifications.length} {filteredNotifications.length === 1 ? 'notification' : 'notifications'}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 text-xs"
              onClick={markAllAsRead}
              disabled={!filteredNotifications.some(n => !n.read)}
            >
              Mark all as read
            </Button>
            <Separator orientation="vertical" className="h-3" />
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 text-xs"
              onClick={clearAllNotifications}
              disabled={filteredNotifications.length === 0}
            >
              Clear all
            </Button>
          </div>
        </div>
        
        <Separator />
        
        {filteredNotifications.length > 0 ? (
          <ScrollArea className="h-[350px]">
            <div className="px-2 py-2">
              {Object.entries(groupedNotifications).map(([date, items]) => (
                <div key={date} className="mb-3">
                  <h5 className="text-xs font-medium text-muted-foreground px-3 mb-1">{date}</h5>
                  <div className="space-y-1">
                    {items.map(notification => (
                      <NotificationItem 
                        key={notification.id} 
                        notification={notification}
                        onClose={() => setOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>No notifications to display</p>
            <p className="text-xs mt-1">When you receive notifications, they will appear here</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}