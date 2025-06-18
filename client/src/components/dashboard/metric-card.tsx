import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "info";
  onClick?: () => void;
}

const variantStyles = {
  default: {
    card: "hover:shadow-lg dark:hover:shadow-xl transition-shadow duration-200",
    icon: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
    value: "text-gray-900 dark:text-white"
  },
  success: {
    card: "hover:shadow-lg dark:hover:shadow-xl transition-shadow duration-200",
    icon: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
    value: "text-gray-900 dark:text-white"
  },
  warning: {
    card: "hover:shadow-lg dark:hover:shadow-xl transition-shadow duration-200",
    icon: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
    value: "text-gray-900 dark:text-white"
  },
  info: {
    card: "hover:shadow-lg dark:hover:shadow-xl transition-shadow duration-200",
    icon: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
    value: "text-gray-900 dark:text-white"
  }
};

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  variant = "default",
  onClick 
}: MetricCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card 
      className={cn(
        "cursor-pointer border-0 shadow-sm bg-white dark:bg-gray-800/50",
        styles.card,
        onClick && "hover:scale-[1.02] transition-transform duration-200"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-2 rounded-lg", styles.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end justify-between">
          <div>
            <div className={cn("text-2xl font-bold", styles.value)}>
              {value}
            </div>
            {trend && (
              <div className="flex items-center mt-2">
                <Badge 
                  variant={trend.isPositive ? "default" : "destructive"}
                  className="text-xs"
                >
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {trend.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}