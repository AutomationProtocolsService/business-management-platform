import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderClosed,
  FileText,
  Receipt,
  Clipboard,
  Wrench,
  User,
  Clock,
  Users,
  PieChart,
  Calendar,
  Settings,
  HelpCircle,
  Package,
  Truck,
  DollarSign,
  ShoppingCart,
  BoxesIcon,
  ChevronRight,
  BarChart3,
  Shield
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SidebarLink = ({ href, icon, children }: SidebarLinkProps) => {
  const [location] = useLocation();
  const isActive = location === href;
  
  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 group",
        isActive 
          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm" 
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
      )}>
        <span className={cn(
          "mr-3 transition-colors",
          isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
        )}>
          {icon}
        </span>
        {children}
      </div>
    </Link>
  );
};

export default function Sidebar() {
  const [salesOpen, setSalesOpen] = useState(true);
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const { user } = useAuth();

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-sm h-full overflow-y-auto hidden lg:block transition-all duration-300">
      <ScrollArea className="h-full">
        <nav className="px-3 py-6">
          <div className="space-y-6">
            {/* Dashboard - Top Level */}
            <div>
              <SidebarLink href="/" icon={<LayoutDashboard className="h-5 w-5" />}>Dashboard</SidebarLink>
            </div>

            {/* Sales Section */}
            <div className="space-y-2">
              <Collapsible open={salesOpen} onOpenChange={setSalesOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  <span>Sales</span>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", salesOpen && "transform rotate-90")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  <SidebarLink href="/customers" icon={<Users className="h-5 w-5" />}>Customers</SidebarLink>
                  <SidebarLink href="/projects" icon={<FolderClosed className="h-5 w-5" />}>Projects</SidebarLink>
                  <SidebarLink href="/quotes" icon={<FileText className="h-5 w-5" />}>Quotes</SidebarLink>
                  <SidebarLink href="/invoices" icon={<Receipt className="h-5 w-5" />}>Invoices</SidebarLink>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Operations Section */}
            <div className="space-y-2">
              <Collapsible open={operationsOpen} onOpenChange={setOperationsOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  <span>Operations</span>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", operationsOpen && "transform rotate-90")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  <SidebarLink href="/surveys" icon={<Clipboard className="h-5 w-5" />}>Surveys</SidebarLink>
                  <SidebarLink href="/installations" icon={<Wrench className="h-5 w-5" />}>Installations</SidebarLink>
                  <SidebarLink href="/employees" icon={<User className="h-5 w-5" />}>Employees</SidebarLink>
                  <SidebarLink href="/timesheets" icon={<Clock className="h-5 w-5" />}>Timesheets</SidebarLink>
                  <SidebarLink href="/expenses" icon={<DollarSign className="h-5 w-5" />}>Expenses</SidebarLink>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Inventory & Procurement Section */}
            <div className="space-y-2">
              <Collapsible open={inventoryOpen} onOpenChange={setInventoryOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  <span>Inventory</span>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", inventoryOpen && "transform rotate-90")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  <SidebarLink href="/catalog-items" icon={<Package className="h-5 w-5" />}>Catalog Items</SidebarLink>
                  <SidebarLink href="/inventory" icon={<BoxesIcon className="h-5 w-5" />}>Inventory</SidebarLink>
                  <SidebarLink href="/suppliers" icon={<Truck className="h-5 w-5" />}>Suppliers</SidebarLink>
                  <SidebarLink href="/purchase-orders" icon={<ShoppingCart className="h-5 w-5" />}>Purchase Orders</SidebarLink>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Analytics & Reports Section */}
            <div className="space-y-2">
              <Collapsible open={reportsOpen} onOpenChange={setReportsOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  <span>Analytics</span>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", reportsOpen && "transform rotate-90")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  <SidebarLink href="/calendar" icon={<Calendar className="h-5 w-5" />}>Calendar</SidebarLink>
                  <SidebarLink href="/reports" icon={<BarChart3 className="h-5 w-5" />}>Reports</SidebarLink>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* Admin Section - Only for admin users */}
            {user?.role === 'admin' && (
              <div className="space-y-1">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Administration
                </div>
                <SidebarLink href="/admin" icon={<Shield className="h-5 w-5" />}>User Management</SidebarLink>
              </div>
            )}

            {/* Bottom Section - Settings & Help */}
            <div className="space-y-1">
              <SidebarLink href="/settings" icon={<Settings className="h-5 w-5" />}>Settings</SidebarLink>
              <SidebarLink href="/help" icon={<HelpCircle className="h-5 w-5" />}>Help & Support</SidebarLink>
            </div>
          </div>
        </nav>
      </ScrollArea>
    </aside>
  );
}
