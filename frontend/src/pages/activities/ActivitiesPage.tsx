import { useCallback, useEffect, useState } from "react";
import { Plus, Phone, Mail, Calendar, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TutorialPanel } from "@/components/tutorial";
import { useApi } from "@/hooks/useApi";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import { ActivityFormModal } from "./ActivityFormModal";
import type { Activity, ActivityType } from "@/types/activities";
import type { PaginatedResponse } from "@/types/crm";

const typeIcons: Record<ActivityType, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task: Clock,
  other: FileText,
};

const typeColors: Record<ActivityType, string> = {
  call: "bg-green-100 text-green-800",
  email: "bg-blue-100 text-blue-800",
  meeting: "bg-purple-100 text-purple-800",
  note: "bg-yellow-100 text-yellow-800",
  task: "bg-orange-100 text-orange-800",
  other: "bg-gray-100 text-gray-800",
};

export function ActivitiesPage() {
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("activities");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const { get, isLoading } = useApi<PaginatedResponse<Activity>>();

  const loadActivities = useCallback(async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: "20",
      sort_by: "activity_date",
      sort_order: "desc",
    });
    if (typeFilter) {
      params.set("activity_type", typeFilter);
    }
    const result = await get(`/activities?${params}`);
    if (result) {
      setActivities(result.items);
      setTotal(result.total);
    }
  }, [get, page, typeFilter]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleActivitySaved = () => {
    setShowActivityModal(false);
    setEditingActivity(null);
    loadActivities();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else if (days === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="activities" />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activities</h1>
          <p className="text-muted-foreground">Track all customer interactions</p>
        </div>
        <Button onClick={() => setShowActivityModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Activity
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <Select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="w-40"
        >
          <option value="">All Types</option>
          <option value="call">Calls</option>
          <option value="email">Emails</option>
          <option value="meeting">Meetings</option>
          <option value="note">Notes</option>
        </Select>

        {/* Quick log buttons */}
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingActivity({ type: "call" } as Activity);
              setShowActivityModal(true);
            }}
          >
            <Phone className="mr-1 h-4 w-4" />
            Log Call
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingActivity({ type: "email" } as Activity);
              setShowActivityModal(true);
            }}
          >
            <Mail className="mr-1 h-4 w-4" />
            Log Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingActivity({ type: "meeting" } as Activity);
              setShowActivityModal(true);
            }}
          >
            <Calendar className="mr-1 h-4 w-4" />
            Log Meeting
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : activities.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No activities logged yet</p>
            </CardContent>
          </Card>
        ) : (
          activities.map((activity) => {
            const Icon = typeIcons[activity.type];
            return (
              <Card
                key={activity.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setEditingActivity(activity);
                  setShowActivityModal(true);
                }}
              >
                <CardContent className="flex items-start gap-4 py-4">
                  <div
                    className={`p-2 rounded-full ${typeColors[activity.type]}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{activity.subject}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {activity.type}
                      </Badge>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {activity.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {activity.contact_name && (
                        <span>Contact: {activity.contact_name}</span>
                      )}
                      {activity.company_name && (
                        <span>Company: {activity.company_name}</span>
                      )}
                      {activity.deal_name && (
                        <span>Deal: {activity.deal_name}</span>
                      )}
                      {activity.outcome && (
                        <span>Outcome: {activity.outcome}</span>
                      )}
                      {activity.duration_minutes && (
                        <span>Duration: {activity.duration_minutes} min</span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground shrink-0">
                    {formatDate(activity.activity_date)}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of{" "}
            {total} activities
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {showActivityModal && (
        <ActivityFormModal
          activity={editingActivity}
          onClose={() => {
            setShowActivityModal(false);
            setEditingActivity(null);
          }}
          onSaved={handleActivitySaved}
        />
      )}
    </div>
  );
}
