import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/date-utils";
import { Clock, User } from "lucide-react";

export interface Event {
  id: number;
  type: "survey" | "installation" | "meeting";
  title: string;
  projectName: string;
  date: string | Date;
  timeRange?: string;
  assignees?: string;
}

interface UpcomingEventsProps {
  events: Event[];
  title?: string;
  emptyMessage?: string;
  viewAllHref?: string;
}

export default function UpcomingEvents({
  events,
  title = "Upcoming Schedule",
  emptyMessage = "No upcoming events",
  viewAllHref = "/calendar"
}: UpcomingEventsProps) {
  return (
    <Card className="border border-gray-200">
      <CardHeader className="border-b border-gray-200 p-4">
        <CardTitle className="text-base font-semibold text-gray-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {events.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          events.map((event) => {
            const date = new Date(event.date);
            const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
            const day = date.getDate();
            
            return (
              <div key={event.id} className="p-2 hover:bg-gray-50 rounded-md">
                <div className="flex">
                  <div className="mr-3 text-center">
                    <div className="bg-gray-100 rounded-md px-2 py-1">
                      <p className="text-xs font-medium text-gray-600">{month}</p>
                      <p className="text-lg font-bold text-gray-800">{day}</p>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {event.type.charAt(0).toUpperCase() + event.type.slice(1)} - {event.title}
                    </p>
                    <div className="flex items-center mt-1 flex-wrap">
                      {event.timeRange && (
                        <>
                          <Clock className="h-3 w-3 text-gray-500 mr-1" />
                          <p className="text-xs text-gray-500 mr-3">{event.timeRange}</p>
                        </>
                      )}
                      {event.assignees && (
                        <>
                          <User className="h-3 w-3 text-gray-500 mr-1" />
                          <p className="text-xs text-gray-500">{event.assignees}</p>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Project: {event.projectName}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
      {events.length > 0 && (
        <CardFooter className="p-3 border-t border-gray-200">
          <a href={viewAllHref} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View full calendar
          </a>
        </CardFooter>
      )}
    </Card>
  );
}
