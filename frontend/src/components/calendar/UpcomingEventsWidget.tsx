import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, Video, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import type { CalendarEvent } from "@/types/calendar";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

interface UpcomingEventsWidgetProps {
  maxItems?: number;
  showTitle?: boolean;
  compact?: boolean;
}

export function UpcomingEventsWidget({
  maxItems = 5,
  showTitle = true,
  compact = false,
}: UpcomingEventsWidgetProps) {
  const { token } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const now = new Date().toISOString();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const response = await fetch(
        `${API_BASE}/calendar/events?start_date=${now}&end_date=${endDate.toISOString()}&limit=${maxItems}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === now.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    }
    return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  const getDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
    if (diff < 60) return `${diff}m`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading events...
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {showTitle && (
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Upcoming Events
          </div>
        )}
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming events</p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between text-sm py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
                  <span className="truncate">{event.title}</span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {formatDate(event.start_time)} {formatTime(event.start_time)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming Events
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <a href="/calendar">View all</a>
            </Button>
          </div>
        </CardHeader>
      )}
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming events
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex flex-col items-center justify-center w-12 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(event.start_time).split(" ")[0]}
                  </span>
                  <span className="text-lg font-bold">
                    {new Date(event.start_time).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium truncate">{event.title}</h4>
                    {event.meeting_link && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => window.open(event.meeting_link, "_blank")}
                      >
                        <Video className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(event.start_time)} ({getDuration(event.start_time, event.end_time)})
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                    )}
                  </div>
                  {Object.keys(event.attendees).length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      {Object.entries(event.attendees).slice(0, 3).map(([email, info]) => (
                        <div
                          key={email}
                          className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium"
                          title={info.name || email}
                        >
                          {(info.name || email).charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {Object.keys(event.attendees).length > 3 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          +{Object.keys(event.attendees).length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
