import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
}

export default function StatCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  trend
}: StatCardProps) {
  return (
    <Card className="border border-gray-200">
      <CardContent className="p-4">
        <div className="flex justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
            {trend && (
              <p 
                className={cn(
                  "text-xs flex items-center mt-1", 
                  trend.isPositive ? "text-success" : 
                  trend.isNeutral ? "text-warning" : 
                  "text-error"
                )}
              >
                <span className="mr-1">↑</span>
                <span>{trend.value}</span>
              </p>
            )}
          </div>
          <div className={cn("rounded-full h-12 w-12 flex items-center justify-center", iconBgColor)}>
            <span className={cn("text-xl", iconColor)}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
