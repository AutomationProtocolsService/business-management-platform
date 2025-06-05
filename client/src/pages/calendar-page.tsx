import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Filter,
  ClipboardCheck,
  Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";

// Add types for calendar events - matching API response
interface CalendarEvent {
  id: string;
  type: 'survey' | 'installation';
  tenant_id: number;
  project_id: number;
  start_date: string;
  end_date: string | null;
  status: string;
}

// Helper function to get days in a month
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Helper function to get day of week
function getDayOfWeek(year: number, month: number, day: number) {
  return new Date(year, month, day).getDay();
}

// Generate calendar days with proper start padding
function generateCalendarDays(year: number, month: number) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getDayOfWeek(year, month, 1);
  
  const days = [];
  
  // Add padding for days from previous month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push({ date: null, isCurrentMonth: false });
  }
  
  // Add days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({ 
      date: new Date(year, month, day), 
      isCurrentMonth: true,
      day
    });
  }
  
  return days;
}

// Helper to get month name
function getMonthName(month: number) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[month];
}

export default function CalendarPage() {
  const { toast } = useToast();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [filterType, setFilterType] = useState("all");
  
  // Update calendar days when month changes
  useEffect(() => {
    const days = generateCalendarDays(
      currentDate.getFullYear(),
      currentDate.getMonth()
    );
    setCalendarDays(days);
  }, [currentDate]);
  
  // Calculate start and end date for the API request
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Fetch calendar events
  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar", startOfMonth.toISOString(), endOfMonth.toISOString(), "v3"],
    queryFn: async ({ queryKey }) => {
      const [_, start, end] = queryKey;
      const url = `/api/calendar?start=${start}&end=${end}`;
      const res = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch calendar events");
      }
      
      const data = await res.json();
      return data;
    }
  });
  


  // Filter events based on type
  const filteredEvents = filterType === "all" 
    ? events 
    : events.filter(event => event.type === filterType);
  
  // Get events for a specific day
  const getEventsForDay = (day: any) => {
    if (!day.date || !filteredEvents.length) return [];
    
    const dayStr = day.date.toISOString().split('T')[0];
    
    return filteredEvents.filter(event => {
      if (!event.start_date) return false;
      
      // Debug logging for installations
      if (event.type === 'installation') {
        console.log('Installation event match check:', {
          eventId: event.id,
          eventDate: event.start_date,
          dayDate: dayStr,
          matches: event.start_date === dayStr,
          dayNumber: day.day
        });
      }
      
      // Direct string comparison - no parsing needed
      return event.start_date === dayStr;
    });
  };
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Render event badge based on type and status
  const renderEventBadge = (event: CalendarEvent) => {
    const type = event.type;
    const status = event.status;
    
    if (type === 'survey') {
      if (status === 'completed') {
        return <Badge variant="outline" className="bg-green-100 text-green-800">Survey</Badge>;
      } else if (status === 'cancelled') {
        return <Badge variant="outline" className="bg-red-100 text-red-800">Survey</Badge>;
      } else {
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Survey</Badge>;
      }
    } else { // installation
      if (status === 'completed') {
        return <Badge variant="outline" className="bg-green-100 text-green-800">Installation</Badge>;
      } else if (status === 'cancelled') {
        return <Badge variant="outline" className="bg-red-100 text-red-800">Installation</Badge>;
      } else {
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Installation</Badge>;
      }
    }
  };

  return (
    <div className="h-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Calendar</h2>
        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3">
          <div className="flex items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToPreviousMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous month</span>
            </Button>
            <div className="mx-2 text-sm font-medium">
              {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next month</span>
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToToday}
            className="h-8"
          >
            Today
          </Button>
          <div className="flex items-center">
            <Filter className="mr-2 h-4 w-4 text-gray-500" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue placeholder="Filter events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="survey">Surveys Only</SelectItem>
                <SelectItem value="installation">Installations Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-1 md:p-2">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Calendar Header - Days of Week */}
              <div className="grid grid-cols-7 border-b border-gray-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <div 
                    key={day} 
                    className="py-2 text-center text-sm font-semibold text-gray-600"
                  >
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 min-h-[600px]">
                {calendarDays.map((day, index) => {
                  const events = getEventsForDay(day);
                  const isToday = day.date && 
                    day.date.getDate() === new Date().getDate() &&
                    day.date.getMonth() === new Date().getMonth() &&
                    day.date.getFullYear() === new Date().getFullYear();
                  
                  return (
                    <div 
                      key={index} 
                      className={`border-b border-r border-gray-200 p-1 md:p-2 min-h-[100px] ${
                        day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${isToday ? 'bg-blue-50' : ''}`}
                    >
                      {day.date && (
                        <>
                          <div className={`text-right text-sm font-medium ${
                            isToday ? 'text-blue-600' : 'text-gray-700'
                          }`}>
                            {day.day}
                          </div>
                          <div className="mt-1 space-y-1 max-h-[80px] overflow-y-auto">
                            {events.map((event) => (
                              <Link 
                                key={event.id} 
                                href={`/${event.type}s/${event.id.split('-')[1]}`}
                                className="block px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50"
                              >
                                <div className="w-full">
                                  {renderEventBadge(event)}
                                  <div className="font-medium text-gray-800 truncate mt-1">
                                    Project #{event.project_id}
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Calendar Legend */}
      <div className="mt-4 flex flex-wrap gap-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-100 border border-blue-800 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">Survey</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-100 border border-yellow-800 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">Installation</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-100 border border-green-800 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">Completed</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-100 border border-red-800 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">Cancelled</span>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Schedule Survey
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-3">
              Create a new survey appointment for a project.
            </p>
            <Link href="/surveys?schedule=new" className="inline-block">
              <Button variant="outline" size="sm">Schedule Survey</Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Wrench className="mr-2 h-4 w-4" />
              Schedule Installation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-3">
              Plan a new installation for a project.
            </p>
            <Link href="/installations?schedule=new" className="inline-block">
              <Button variant="outline" size="sm">Schedule Installation</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
