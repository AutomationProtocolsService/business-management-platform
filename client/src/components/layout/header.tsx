import { useState } from "react";
import { Menu, Bell, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { NotificationsCenter } from "@/components/notifications";

export default function Header() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/auth");
      }
    });
  };

  const toggleSidebar = () => {
    const sidebar = document.querySelector("aside");
    if (sidebar) {
      sidebar.classList.toggle("hidden");
    }
    setSidebarOpen(!sidebarOpen);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex justify-between items-center px-4 py-2">
        <div className="flex items-center">
          <Button
            id="sidebar-toggle"
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2 text-gray-600 lg:hidden"
          >
            <Menu />
          </Button>
          <h1 className="text-xl font-semibold text-gray-800">Business Management System</h1>
        </div>
        <div className="flex items-center space-x-4">
          <NotificationsCenter />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center text-gray-700 hover:text-gray-900">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback className="bg-primary-600 text-white">
                    {user ? getInitials(user.fullName) : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block">{user?.fullName}</span>
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Your Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
