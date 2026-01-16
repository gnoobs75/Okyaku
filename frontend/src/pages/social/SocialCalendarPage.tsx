import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Linkedin,
  Twitter,
  Facebook,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Inbox,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { TutorialPanel } from "@/components/tutorial";
import { useApi } from "@/hooks/useApi";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import { PostFormModal } from "./PostFormModal";
import type {
  SocialAccount,
  SocialPost,
  SocialPostWithAnalytics,
  SocialPlatform,
  PostStatus,
} from "@/types/social";

const platformIcons: Record<SocialPlatform, typeof Linkedin> = {
  linkedin: Linkedin,
  twitter: Twitter,
  facebook: Facebook,
};

const platformColors: Record<SocialPlatform, string> = {
  linkedin: "bg-blue-600",
  twitter: "bg-sky-500",
  facebook: "bg-blue-500",
};

const statusColors: Record<PostStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  scheduled: "bg-blue-100 text-blue-800",
  queued: "bg-yellow-100 text-yellow-800",
  publishing: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const statusIcons: Record<PostStatus, typeof Clock> = {
  draft: Clock,
  scheduled: Clock,
  queued: Clock,
  publishing: Clock,
  published: CheckCircle,
  failed: XCircle,
  cancelled: XCircle,
};

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  posts: SocialPostWithAnalytics[];
}

export function SocialCalendarPage() {
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("social-calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<SocialPostWithAnalytics[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { get: getAccounts } = useApi<SocialAccount[]>();
  const { get: getPosts } = useApi<SocialPostWithAnalytics[]>();
  const { post: schedulePost } = useApi<{ status: string }>();

  const loadAccounts = useCallback(async () => {
    const result = await getAccounts("/social/accounts");
    if (result) {
      setAccounts(result);
    }
  }, [getAccounts]);

  const loadPosts = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedAccountId) {
      params.set("account_id", selectedAccountId);
    }
    if (selectedStatus) {
      params.set("status", selectedStatus);
    }
    const result = await getPosts(`/social/posts?${params}`);
    if (result) {
      setPosts(result);
    }
  }, [getPosts, selectedAccountId, selectedStatus]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const getDaysInMonth = (date: Date): CalendarDay[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: CalendarDay[] = [];

    // Add days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: false,
        posts: getPostsForDate(d),
      });
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      d.setHours(0, 0, 0, 0);
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: d.getTime() === today.getTime(),
        posts: getPostsForDate(d),
      });
    }

    // Add days from next month
    const endPadding = 42 - days.length; // 6 weeks
    for (let i = 1; i <= endPadding; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: false,
        posts: getPostsForDate(d),
      });
    }

    return days;
  };

  const getPostsForDate = (date: Date): SocialPostWithAnalytics[] => {
    return posts.filter((post) => {
      if (!post.scheduled_at && !post.published_at) return false;
      const postDate = new Date(post.scheduled_at || post.published_at || "");
      return (
        postDate.getFullYear() === date.getFullYear() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getDate() === date.getDate()
      );
    });
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1)
    );
  };

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDate(day.date);
    setEditingPost(null);
    setShowPostModal(true);
  };

  const handlePostClick = (post: SocialPost, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPost(post);
    setSelectedDate(null);
    setShowPostModal(true);
  };

  const handlePostSaved = () => {
    setShowPostModal(false);
    setEditingPost(null);
    setSelectedDate(null);
    loadPosts();
  };

  const handleDragStart = (e: React.DragEvent, post: SocialPost) => {
    e.dataTransfer.setData("postId", post.id);
  };

  const handleDrop = async (e: React.DragEvent, day: CalendarDay) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData("postId");
    if (!postId) return;

    const post = posts.find((p) => p.id === postId);
    if (!post || post.status !== "scheduled") return;

    // Reschedule the post
    const newDate = new Date(day.date);
    if (post.scheduled_at) {
      const oldDate = new Date(post.scheduled_at);
      newDate.setHours(oldDate.getHours(), oldDate.getMinutes());
    } else {
      newDate.setHours(9, 0); // Default to 9 AM
    }

    await schedulePost(
      `/social/posts/${postId}/schedule?scheduled_at=${newDate.toISOString()}`,
      {}
    );
    loadPosts();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const calendarDays = getDaysInMonth(currentDate);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="social-calendar" />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Social Media Calendar</h1>
          <p className="text-muted-foreground">
            Plan and schedule your social media content
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/social/analytics">
            <Button variant="outline">
              <BarChart2 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
          </Link>
          <Link to="/social/inbox">
            <Button variant="outline">
              <Inbox className="mr-2 h-4 w-4" />
              Inbox
            </Button>
          </Link>
          <Link to="/social/accounts">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Accounts
            </Button>
          </Link>
          <Button onClick={() => setShowPostModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Button>
        </div>
      </div>

      {/* Filters and Navigation */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold min-w-[150px] text-center">
            {currentDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>

        <div className="flex-1" />

        <div className="flex gap-2">
          <Select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-40"
          >
            <option value="">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.platform_username}
              </option>
            ))}
          </Select>

          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-32"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="failed">Failed</option>
          </Select>
        </div>
      </div>

      {/* Connected Accounts */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No social media accounts connected. Connect your accounts to start
              scheduling posts.
            </p>
            <Link to="/social/accounts">
              <Button>Connect Account</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Account Pills */}
          <div className="flex flex-wrap gap-2">
            {accounts.map((account) => {
              const Icon = platformIcons[account.platform];
              return (
                <div
                  key={account.id}
                  className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      platformColors[account.platform]
                    }`}
                  >
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm">{account.platform_username}</span>
                  {account.status !== "connected" && (
                    <Badge variant="destructive" className="text-xs">
                      {account.status}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Grid */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-7">
                {/* Weekday Headers */}
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className="p-2 text-center text-sm font-semibold border-b"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`min-h-[120px] border-b border-r p-1 cursor-pointer hover:bg-muted/50 transition-colors ${
                      !day.isCurrentMonth ? "bg-muted/20" : ""
                    } ${day.isToday ? "bg-blue-50" : ""}`}
                    onClick={() => handleDayClick(day)}
                    onDrop={(e) => handleDrop(e, day)}
                    onDragOver={handleDragOver}
                  >
                    <div
                      className={`text-sm mb-1 ${
                        day.isToday
                          ? "w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center"
                          : day.isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {day.posts.slice(0, 3).map((post) => {
                        const account = accounts.find(
                          (a) => a.id === post.account_id
                        );
                        const Icon = account
                          ? platformIcons[account.platform]
                          : Calendar;
                        const StatusIcon = statusIcons[post.status];

                        return (
                          <div
                            key={post.id}
                            draggable={post.status === "scheduled"}
                            onDragStart={(e) => handleDragStart(e, post)}
                            onClick={(e) => handlePostClick(post, e)}
                            className={`text-xs p-1 rounded truncate flex items-center gap-1 cursor-pointer hover:opacity-80 ${
                              statusColors[post.status]
                            }`}
                          >
                            <Icon className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{post.content.slice(0, 20)}</span>
                            <StatusIcon className="h-3 w-3 flex-shrink-0 ml-auto" />
                          </div>
                        );
                      })}
                      {day.posts.length > 3 && (
                        <div className="text-xs text-muted-foreground pl-1">
                          +{day.posts.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Post Modal */}
      {showPostModal && (
        <PostFormModal
          accounts={accounts}
          post={editingPost}
          defaultDate={selectedDate}
          onClose={() => {
            setShowPostModal(false);
            setEditingPost(null);
            setSelectedDate(null);
          }}
          onSaved={handlePostSaved}
        />
      )}
    </div>
  );
}
