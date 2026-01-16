import { useState, useEffect } from "react";
import { Calendar, Link2, Clock, Plus, Trash2, RefreshCw, ExternalLink, Copy, Check } from "lucide-react";
import { TutorialPanel } from "@/components/tutorial";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import type {
  CalendarConnection,
  CalendarProvider,
  SchedulingLink,
  ScheduledMeeting,
} from "@/types/calendar";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export function CalendarSettingsPage() {
  const { token } = useAuth();
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("calendar-settings");
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [schedulingLinks, setSchedulingLinks] = useState<SchedulingLink[]>([]);
  const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const [newLink, setNewLink] = useState({
    name: "",
    slug: "",
    description: "",
    duration_minutes: 30,
    buffer_before: 0,
    buffer_after: 0,
    timezone: "UTC",
    min_notice_hours: 24,
    max_days_ahead: 60,
    location_type: "video",
    meeting_provider: "zoom",
  });

  useEffect(() => {
    fetchConnections();
    fetchSchedulingLinks();
    fetchScheduledMeetings();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await fetch(`${API_BASE}/calendar/connections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedulingLinks = async () => {
    try {
      const response = await fetch(`${API_BASE}/calendar/scheduling-links`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSchedulingLinks(data);
      }
    } catch (error) {
      console.error("Failed to fetch scheduling links:", error);
    }
  };

  const fetchScheduledMeetings = async () => {
    try {
      const response = await fetch(`${API_BASE}/calendar/scheduled-meetings?upcoming_only=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setScheduledMeetings(data);
      }
    } catch (error) {
      console.error("Failed to fetch scheduled meetings:", error);
    }
  };

  const connectCalendar = async (provider: CalendarProvider) => {
    try {
      const response = await fetch(`${API_BASE}/calendar/oauth/${provider}/url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to get OAuth URL:", error);
    }
  };

  const disconnectCalendar = async (connectionId: string) => {
    try {
      const response = await fetch(`${API_BASE}/calendar/connections/${connectionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setConnections(connections.filter((c) => c.id !== connectionId));
      }
    } catch (error) {
      console.error("Failed to disconnect calendar:", error);
    }
  };

  const syncCalendar = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const response = await fetch(`${API_BASE}/calendar/connections/${connectionId}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        alert(`Synced ${data.synced_events} events`);
        fetchConnections();
      }
    } catch (error) {
      console.error("Failed to sync calendar:", error);
    } finally {
      setSyncing(null);
    }
  };

  const createSchedulingLink = async () => {
    try {
      const response = await fetch(`${API_BASE}/calendar/scheduling-links`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newLink),
      });
      if (response.ok) {
        const data = await response.json();
        setSchedulingLinks([...schedulingLinks, data]);
        setShowLinkDialog(false);
        setNewLink({
          name: "",
          slug: "",
          description: "",
          duration_minutes: 30,
          buffer_before: 0,
          buffer_after: 0,
          timezone: "UTC",
          min_notice_hours: 24,
          max_days_ahead: 60,
          location_type: "video",
          meeting_provider: "zoom",
        });
      }
    } catch (error) {
      console.error("Failed to create scheduling link:", error);
    }
  };

  const deleteSchedulingLink = async (linkId: string) => {
    try {
      const response = await fetch(`${API_BASE}/calendar/scheduling-links/${linkId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setSchedulingLinks(schedulingLinks.filter((l) => l.id !== linkId));
      }
    } catch (error) {
      console.error("Failed to delete scheduling link:", error);
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/schedule/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "expired":
        return <Badge className="bg-yellow-100 text-yellow-800">Expired</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProviderIcon = (provider: CalendarProvider) => {
    if (provider === "google") {
      return (
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border">
          <span className="text-lg">G</span>
        </div>
      );
    }
    return (
      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
        <span className="text-white text-sm font-bold">O</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="calendar-settings" />
      )}

      <div>
        <h1 className="text-2xl font-bold">Calendar Settings</h1>
        <p className="text-muted-foreground">
          Connect your calendars and manage scheduling links
        </p>
      </div>

      <Tabs defaultValue="connections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connections">
            <Calendar className="h-4 w-4 mr-2" />
            Connections
          </TabsTrigger>
          <TabsTrigger value="scheduling">
            <Link2 className="h-4 w-4 mr-2" />
            Scheduling Links
          </TabsTrigger>
          <TabsTrigger value="meetings">
            <Clock className="h-4 w-4 mr-2" />
            Upcoming Meetings
          </TabsTrigger>
        </TabsList>

        {/* Connections Tab */}
        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected Calendars</CardTitle>
              <CardDescription>
                Connect your Google or Outlook calendar to sync events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connections.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No calendars connected yet
                </p>
              ) : (
                connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      {getProviderIcon(connection.provider)}
                      <div>
                        <p className="font-medium capitalize">{connection.provider} Calendar</p>
                        <p className="text-sm text-muted-foreground">
                          {connection.provider_email}
                        </p>
                        {connection.last_synced_at && (
                          <p className="text-xs text-muted-foreground">
                            Last synced: {new Date(connection.last_synced_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(connection.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncCalendar(connection.id)}
                        disabled={syncing === connection.id}
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-1 ${syncing === connection.id ? "animate-spin" : ""}`}
                        />
                        Sync
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectCalendar(connection.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={() => connectCalendar("google")} variant="outline">
                  <span className="mr-2">G</span>
                  Connect Google Calendar
                </Button>
                <Button onClick={() => connectCalendar("outlook")} variant="outline">
                  <span className="mr-2 text-blue-600 font-bold">O</span>
                  Connect Outlook Calendar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduling Links Tab */}
        <TabsContent value="scheduling" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Scheduling Links</CardTitle>
                <CardDescription>
                  Create booking links for others to schedule meetings with you
                </CardDescription>
              </div>
              <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Link
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Scheduling Link</DialogTitle>
                    <DialogDescription>
                      Set up a new meeting booking link
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={newLink.name}
                        onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                        placeholder="e.g., 30 Minute Meeting"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL Slug</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">/schedule/</span>
                        <Input
                          value={newLink.slug}
                          onChange={(e) => setNewLink({ ...newLink, slug: e.target.value })}
                          placeholder="my-meeting"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newLink.description}
                        onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                        placeholder="Brief description of this meeting type"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Duration (minutes)</Label>
                        <Select
                          value={String(newLink.duration_minutes)}
                          onValueChange={(v) =>
                            setNewLink({ ...newLink, duration_minutes: parseInt(v) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                            <SelectItem value="60">60 min</SelectItem>
                            <SelectItem value="90">90 min</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Meeting Type</Label>
                        <Select
                          value={newLink.location_type}
                          onValueChange={(v) => setNewLink({ ...newLink, location_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="video">Video Call</SelectItem>
                            <SelectItem value="phone">Phone Call</SelectItem>
                            <SelectItem value="in_person">In Person</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createSchedulingLink}>Create Link</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {schedulingLinks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No scheduling links created yet
                </p>
              ) : (
                <div className="space-y-3">
                  {schedulingLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{link.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {link.duration_minutes} min • {link.location_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {link.booking_count} bookings
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={link.is_active ? "default" : "secondary"}>
                          {link.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyLink(link.slug)}
                        >
                          {copiedSlug === link.slug ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/schedule/${link.slug}`, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSchedulingLink(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Meetings Tab */}
        <TabsContent value="meetings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
              <CardDescription>
                Meetings booked through your scheduling links
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scheduledMeetings.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No upcoming meetings
                </p>
              ) : (
                <div className="space-y-3">
                  {scheduledMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {meeting.guest_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{meeting.guest_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {meeting.guest_email}
                          </p>
                          <p className="text-sm">
                            {new Date(meeting.start_time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={meeting.status === "confirmed" ? "default" : "secondary"}
                        >
                          {meeting.status}
                        </Badge>
                        {meeting.meeting_link && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(meeting.meeting_link, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Join
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
