import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Inbox,
  Mail,
  MessageSquare,
  AtSign,
  Reply,
  Archive,
  RefreshCw,
  Search,
  Filter,
  Send,
  User,
  Linkedin,
  Twitter,
  Facebook,
  CheckCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TutorialPanel } from "@/components/tutorial";
import { useApi } from "@/hooks/useApi";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import { cn } from "@/lib/utils";
import type {
  SocialMessage,
  SocialMessageReply,
  InboxStats,
  SocialPlatform,
  MessageType,
  MessageStatus,
} from "@/types/social";

const platformIcons: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  linkedin: Linkedin,
  twitter: Twitter,
  facebook: Facebook,
};

const platformColors: Record<SocialPlatform, string> = {
  linkedin: "bg-blue-600",
  twitter: "bg-sky-500",
  facebook: "bg-blue-500",
};

const messageTypeIcons: Record<MessageType, React.ComponentType<{ className?: string }>> = {
  direct_message: Mail,
  mention: AtSign,
  comment: MessageSquare,
  reply: Reply,
};

const statusColors: Record<MessageStatus, string> = {
  unread: "bg-blue-500",
  read: "bg-gray-400",
  responded: "bg-green-500",
  archived: "bg-gray-300",
};

export function SocialInboxPage() {
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("social-inbox");
  const { get, post } = useApi();
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<SocialMessage | null>(null);
  const [replies, setReplies] = useState<SocialMessageReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (platformFilter !== "all") params.append("platform", platformFilter);
      if (typeFilter !== "all") params.append("message_type", typeFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);

      const data = await get(`/social/inbox/messages?${params.toString()}`);
      if (data) setMessages(data as SocialMessage[]);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [get, platformFilter, typeFilter, statusFilter, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await get("/social/inbox/messages/stats");
      if (data) setStats(data as InboxStats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, [get]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMessages(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchMessages, fetchStats]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await post("/social/inbox/sync", {});
      await fetchMessages();
      await fetchStats();
    } catch (error) {
      console.error("Failed to sync:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectMessage = async (message: SocialMessage) => {
    setSelectedMessage(message);
    setSheetOpen(true);
    setReplyContent("");

    // Fetch replies
    try {
      const data = await get(`/social/inbox/messages/${message.id}/replies`);
      if (data) setReplies(data as SocialMessageReply[]);
      else setReplies([]);
    } catch (error) {
      console.error("Failed to fetch replies:", error);
      setReplies([]);
    }

    // Mark as read if unread
    if (message.status === "unread") {
      try {
        await post(`/social/inbox/messages/${message.id}/read`, {});
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? { ...m, status: "read" } : m))
        );
        setSelectedMessage((prev) => (prev ? { ...prev, status: "read" } : null));
        fetchStats();
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }
  };

  const handleArchive = async () => {
    if (!selectedMessage) return;

    try {
      await post(`/social/inbox/messages/${selectedMessage.id}/archive`, {});
      setMessages((prev) =>
        prev.map((m) =>
          m.id === selectedMessage.id ? { ...m, status: "archived" } : m
        )
      );
      setSelectedMessage((prev) => (prev ? { ...prev, status: "archived" } : null));
      fetchStats();
    } catch (error) {
      console.error("Failed to archive:", error);
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyContent.trim()) return;

    setSendingReply(true);
    try {
      const data = await post(`/social/inbox/messages/${selectedMessage.id}/reply`, {
        content: replyContent,
      });
      if (data) setReplies((prev) => [...prev, data as SocialMessageReply]);
      setReplyContent("");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === selectedMessage.id ? { ...m, status: "responded" } : m
        )
      );
      setSelectedMessage((prev) => (prev ? { ...prev, status: "responded" } : null));
      fetchStats();
    } catch (error) {
      console.error("Failed to send reply:", error);
    } finally {
      setSendingReply(false);
    }
  };

  const PlatformIcon = selectedMessage
    ? platformIcons[selectedMessage.platform]
    : Mail;

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="social-inbox" />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Social Inbox</h1>
          <p className="text-muted-foreground">
            Manage messages from all your social platforms
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
          Sync Messages
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <Inbox className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
              <Mail className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unread}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Responded</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.responded}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">By Platform</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {Object.entries(stats.by_platform).map(([platform, count]) => (
                  <Badge key={platform} variant="secondary">
                    {platform}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-[150px]"
            >
              <option value="all">All Platforms</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">Twitter/X</option>
              <option value="facebook">Facebook</option>
            </Select>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-[150px]"
            >
              <option value="all">All Types</option>
              <option value="direct_message">Direct Messages</option>
              <option value="mention">Mentions</option>
              <option value="comment">Comments</option>
              <option value="reply">Replies</option>
            </Select>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-[150px]"
            >
              <option value="all">All Status</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="responded">Responded</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Message List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No messages</h3>
              <p className="text-muted-foreground">
                {searchQuery || platformFilter !== "all" || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Sync your accounts to fetch new messages"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {messages.map((message) => {
                const MsgPlatformIcon = platformIcons[message.platform];
                const MsgTypeIcon = messageTypeIcons[message.message_type];

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                      message.status === "unread" && "bg-blue-50 dark:bg-blue-950/20"
                    )}
                    onClick={() => handleSelectMessage(message)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={message.sender_profile_image} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold truncate">
                          {message.sender_display_name || message.sender_username}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          @{message.sender_username}
                        </span>
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            statusColors[message.status]
                          )}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {message.content}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MsgPlatformIcon className="h-3 w-3" />
                          <span className="capitalize">{message.platform}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MsgTypeIcon className="h-3 w-3" />
                          <span className="capitalize">
                            {message.message_type.replace("_", " ")}
                          </span>
                        </div>
                        <span>
                          {formatDistanceToNow(new Date(message.received_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={
                        message.status === "unread"
                          ? "default"
                          : message.status === "responded"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {message.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          {selectedMessage && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div
                    className={cn(
                      "p-2 rounded-full",
                      platformColors[selectedMessage.platform]
                    )}
                  >
                    <PlatformIcon className="h-4 w-4 text-white" />
                  </div>
                  <span className="capitalize">{selectedMessage.platform}</span>
                  <Badge variant="outline" className="ml-auto">
                    {selectedMessage.status}
                  </Badge>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Sender Info */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedMessage.sender_profile_image} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {selectedMessage.sender_display_name ||
                        selectedMessage.sender_username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{selectedMessage.sender_username}
                    </p>
                  </div>
                </div>

                {/* Message Content */}
                <div className="rounded-lg bg-muted p-4">
                  <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(selectedMessage.received_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleArchive}
                    disabled={selectedMessage.status === "archived"}
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    Archive
                  </Button>
                </div>

                {/* Replies */}
                {replies.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Replies</h4>
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="rounded-lg bg-primary/10 p-3 ml-4"
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {reply.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>
                            {formatDistanceToNow(new Date(reply.sent_at), {
                              addSuffix: true,
                            })}
                          </span>
                          {reply.send_status === "sent" ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <X className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                        {reply.error_message && (
                          <p className="text-xs text-red-500 mt-1">
                            {reply.error_message}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {selectedMessage.status !== "archived" && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Send Reply</h4>
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={3}
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyContent.trim() || sendingReply}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendingReply ? "Sending..." : "Send Reply"}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
