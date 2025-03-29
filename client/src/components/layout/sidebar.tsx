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
  Truck
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
        "flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer",
        isActive 
          ? "bg-gray-100 text-primary-600" 
          : "text-gray-700 hover:bg-gray-100 hover:text-primary-600"
      )}>
        <span className="mr-3 text-lg">{icon}</span>
        {children}
      </div>
    </Link>
  );
};

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 shadow-sm h-full overflow-y-auto hidden lg:block transition-all duration-300">
      <ScrollArea className="h-full">
        <nav className="px-2 py-4">
          <div className="space-y-1">
            <SidebarLink href="/" icon={<LayoutDashboard />}>Dashboard</SidebarLink>
            <SidebarLink href="/projects" icon={<FolderClosed />}>Projects</SidebarLink>
            <SidebarLink href="/quotes" icon={<FileText />}>Quotes</SidebarLink>
            <SidebarLink href="/invoices" icon={<Receipt />}>Invoices</SidebarLink>
            <SidebarLink href="/surveys" icon={<Clipboard />}>Surveys</SidebarLink>
            <SidebarLink href="/installations" icon={<Wrench />}>Installations</SidebarLink>
            <SidebarLink href="/employees" icon={<User />}>Employees</SidebarLink>
            <SidebarLink href="/timesheets" icon={<Clock />}>Timesheets</SidebarLink>
            <SidebarLink href="/customers" icon={<Users />}>Customers</SidebarLink>
            <SidebarLink href="/catalog-items" icon={<Package />}>Catalog Items</SidebarLink>
            <SidebarLink href="/suppliers" icon={<Truck />}>Suppliers</SidebarLink>
            <SidebarLink href="/reports" icon={<PieChart />}>Reports</SidebarLink>
            <SidebarLink href="/calendar" icon={<Calendar />}>Calendar</SidebarLink>
          </div>
          <div className="mt-8 pt-4 border-t border-gray-200">
            <SidebarLink href="/settings" icon={<Settings />}>Settings</SidebarLink>
            <SidebarLink href="/help" icon={<HelpCircle />}>Help & Support</SidebarLink>
          </div>
        </nav>
      </ScrollArea>
    </aside>
  );
}
