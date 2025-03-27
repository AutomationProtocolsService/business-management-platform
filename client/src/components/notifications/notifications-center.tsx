import React, { useState } from 'react';
import { useNotifications, NotificationCategory } from './notifications-provider';
import { Bell, Check, CheckCheck, Trash2, Filter, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationsCenter() {
  const { 
    notifications, 
    filteredNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    clearAllNotifications,
    unreadCount,
    activeFilter,
    setFilter
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 border-green-500 text-green-800';
      case 'error': return 'bg-red-100 border-red-500 text-red-800';
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'info': return 'bg-blue-100 border-blue-500 text-blue-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };
  
  const getCategoryLabel = (category: NotificationCategory) => {
    switch (category) {
      case 'customer': return 'Customer';
      case 'project': return 'Project';
      case 'quote': return 'Quote';
      case 'invoice': return 'Invoice';
      case 'survey': return 'Survey';
      case 'installation': return 'Installation';
      case 'employee': return 'Employee';
      case 'timesheet': return 'Timesheet';
      case 'task': return 'Task';
      case 'system': return 'System';
      default: return 'Unknown';
    }
  };
  
  const getCategoryIcon = (category: NotificationCategory) => {
    return <Badge variant="outline" className="text-xs capitalize mr-1">{category}</Badge>;
  };

  const filterOptions: { label: string; value: NotificationCategory | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Customers', value: 'customer' },
    { label: 'Projects', value: 'project' },
    { label: 'Quotes', value: 'quote' },
    { label: 'Invoices', value: 'invoice' },
    { label: 'Surveys', value: 'survey' },
    { label: 'Installations', value: 'installation' },
    { label: 'Employees', value: 'employee' },
    { label: 'Timesheets', value: 'timesheet' },
    { label: 'Tasks', value: 'task' },
    { label: 'System', value: 'system' },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[1.2rem] h-5 flex items-center justify-center"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center">
            <h3 className="font-medium mr-2">Notifications</h3>
            <Badge variant={activeFilter === 'all' ? 'secondary' : 'outline'} className="text-xs">
              {activeFilter === 'all' ? 'All' : getCategoryLabel(activeFilter)}
            </Badge>
          </div>
          <div className="flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {filterOptions.map((option) => (
                  <DropdownMenuItem 
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    className={activeFilter === option.value ? "bg-secondary/50" : ""}
                  >
                    {option.label}
                    {activeFilter === option.value && <Check className="h-4 w-4 ml-2" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={clearAllNotifications}
                  title="Clear all notifications"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        <Tabs defaultValue="all">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <ScrollArea className="h-[400px]">
              {filteredNotifications.length > 0 ? (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 relative ${
                        notification.read ? '' : 'bg-muted/50'
                      } hover:bg-muted/20 group`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            {getCategoryIcon(notification.category)}
                            <span className={`text-xs font-medium ${
                              notification.type === 'error' ? 'text-red-500' : 
                              notification.type === 'warning' ? 'text-yellow-500' : 
                              notification.type === 'success' ? 'text-green-500' : 
                              notification.type === 'info' ? 'text-blue-500' : 'text-gray-500'
                            }`}>
                              {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm mb-1 break-words">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={() => markAsRead(notification.id)}
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => deleteNotification(notification.id)}
                            title="Delete notification"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-20 text-muted-foreground">
                  {activeFilter === 'all' ? 'No notifications' : `No ${getCategoryLabel(activeFilter).toLowerCase()} notifications`}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="unread" className="mt-0">
            <ScrollArea className="h-[400px]">
              {filteredNotifications.filter(n => !n.read).length > 0 ? (
                <div className="divide-y">
                  {filteredNotifications.filter(n => !n.read).map((notification) => (
                    <div
                      key={notification.id}
                      className="p-3 relative bg-muted/50 hover:bg-muted/20 group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            {getCategoryIcon(notification.category)}
                            <span className={`text-xs font-medium ${
                              notification.type === 'error' ? 'text-red-500' : 
                              notification.type === 'warning' ? 'text-yellow-500' : 
                              notification.type === 'success' ? 'text-green-500' : 
                              notification.type === 'info' ? 'text-blue-500' : 'text-gray-500'
                            }`}>
                              {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm mb-1 break-words">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => deleteNotification(notification.id)}
                            title="Delete notification"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-20 text-muted-foreground">
                  No unread notifications
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}