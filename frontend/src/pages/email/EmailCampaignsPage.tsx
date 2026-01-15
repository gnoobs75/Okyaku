import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Mail,
  Calendar,
  Send,
  Eye,
  MousePointer,
  Clock,
  CheckCircle,
  XCircle,
  PauseCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApi } from "@/hooks/useApi";
import type { EmailCampaignWithMetrics, CampaignStatus } from "@/types/email";

const statusColors: Record<CampaignStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  scheduled: "bg-blue-100 text-blue-800",
  sending: "bg-yellow-100 text-yellow-800",
  sent: "bg-green-100 text-green-800",
  paused: "bg-orange-100 text-orange-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusIcons: Record<CampaignStatus, typeof Mail> = {
  draft: Mail,
  scheduled: Clock,
  sending: Send,
  sent: CheckCircle,
  paused: PauseCircle,
  cancelled: XCircle,
};

export function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaignWithMetrics[]>([]);
  const { get, isLoading } = useApi<EmailCampaignWithMetrics[]>();

  const loadCampaigns = useCallback(async () => {
    const result = await get("/email/campaigns");
    if (result) {
      setCampaigns(result);
    }
  }, [get]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Calculate summary stats
  const totalSent = campaigns
    .filter((c) => c.status === "sent")
    .reduce((sum, c) => sum + c.sent_count, 0);
  const totalDelivered = campaigns
    .filter((c) => c.status === "sent")
    .reduce((sum, c) => sum + c.delivered_count, 0);
  const avgOpenRate =
    campaigns.filter((c) => c.status === "sent" && c.open_rate > 0).length > 0
      ? campaigns
          .filter((c) => c.status === "sent" && c.open_rate > 0)
          .reduce((sum, c) => sum + c.open_rate, 0) /
        campaigns.filter((c) => c.status === "sent" && c.open_rate > 0).length
      : 0;
  const avgClickRate =
    campaigns.filter((c) => c.status === "sent" && c.click_rate > 0).length > 0
      ? campaigns
          .filter((c) => c.status === "sent" && c.click_rate > 0)
          .reduce((sum, c) => sum + c.click_rate, 0) /
        campaigns.filter((c) => c.status === "sent" && c.click_rate > 0).length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-muted-foreground">
            Create and manage your email marketing campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/email/templates">
            <Button variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              Templates
            </Button>
          </Link>
          <Link to="/email/campaigns/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Emails sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalDelivered.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOpenRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgClickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Open Rate</TableHead>
                <TableHead>Click Rate</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No campaigns yet. Create your first campaign to get started.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => {
                  const StatusIcon = statusIcons[campaign.status];
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <Link
                          to={`/email/campaigns/${campaign.id}`}
                          className="font-medium hover:underline"
                        >
                          {campaign.name}
                        </Link>
                        {campaign.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {campaign.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[campaign.status]}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {campaign.total_recipients > 0 ? (
                          <div>
                            <span className="font-medium">
                              {campaign.total_recipients.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {" "}
                              / {campaign.sent_count} sent
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {campaign.status === "sent" && campaign.delivered_count > 0 ? (
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span>{campaign.open_rate.toFixed(1)}%</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {campaign.status === "sent" && campaign.delivered_count > 0 ? (
                          <div className="flex items-center gap-2">
                            <MousePointer className="h-4 w-4 text-muted-foreground" />
                            <span>{campaign.click_rate.toFixed(1)}%</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {campaign.status === "scheduled" ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(campaign.scheduled_at)}
                          </div>
                        ) : campaign.status === "sent" ? (
                          <span className="text-sm">
                            {formatDate(campaign.completed_at)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {formatDate(campaign.created_at)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
