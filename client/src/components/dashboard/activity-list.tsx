import { ReactNode } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/date-utils";

export interface Activity {
  id: number;
  type: string;
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
  title: string;
  description: string;
  timestamp: Date | string;
}

interface ActivityListProps {
  activities: Activity[];
  title?: string;
  emptyMessage?: string;
  viewAllHref?: string;
}

export default function ActivityList({
  activities,
  title = "Recent Activities",
  emptyMessage = "No recent activities",
  viewAllHref = "#"
}: ActivityListProps) {
  return (
    <Card className="border border-gray-200">
      <CardHeader className="border-b border-gray-200 p-4">
        <CardTitle className="text-base font-semibold text-gray-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {activities.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="p-2 hover:bg-gray-50 rounded-md">
              <div className="flex items-start">
                <div className={`${activity.iconBgColor} rounded-full h-8 w-8 flex items-center justify-center ${activity.iconColor} mr-3`}>
                  {activity.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{activity.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.description} • {formatRelativeTime(activity.timestamp)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
      {activities.length > 0 && (
        <CardFooter className="p-3 border-t border-gray-200">
          <a href={viewAllHref} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all activities
          </a>
        </CardFooter>
      )}
    </Card>
  );
}
