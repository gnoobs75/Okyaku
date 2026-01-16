import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { TutorialPanel } from "@/components/tutorial";
import { useTutorial } from "@/context/TutorialContext";
import { getTutorialForStage } from "@/content/tutorials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  MessageSquare,
  UserPlus,
  Heart,
  Bell,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
} from "lucide-react";
import {
  AutomationRule,
  AutomationStats,
  RuleCondition,
  RuleAction,
  ResponseTemplate,
  ExecutionLog,
  AutomationRuleCreate,
  ResponseTemplateCreate,
  RuleActionCreate,
  RuleStatus,
  TriggerType,
  ActionType,
} from "@/types/engagementAutomation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const STATUS_COLORS: Record<RuleStatus, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  archived: "bg-gray-100 text-gray-700",
};

const TRIGGER_LABELS: Record<TriggerType, { label: string; icon: typeof Zap }> = {
  new_follower: { label: "New Follower", icon: UserPlus },
  new_mention: { label: "New Mention", icon: MessageSquare },
  new_comment: { label: "New Comment", icon: MessageSquare },
  new_dm: { label: "New DM", icon: MessageSquare },
  keyword_match: { label: "Keyword Match", icon: FileText },
  sentiment: { label: "Sentiment", icon: Heart },
  high_engagement: { label: "High Engagement", icon: Zap },
};

const ACTION_LABELS: Record<ActionType, string> = {
  send_dm: "Send DM",
  reply_comment: "Reply to Comment",
  like_post: "Like Post",
  follow_back: "Follow Back",
  add_to_list: "Add to List",
  create_task: "Create Task",
  send_notification: "Send Notification",
  webhook: "Call Webhook",
};

export function EngagementAutomationPage() {
  const { token } = useAuth();
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("engagement-automation");
  const [activeTab, setActiveTab] = useState("rules");
  const [loading, setLoading] = useState(true);

  // Data states
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [ruleConditions, setRuleConditions] = useState<RuleCondition[]>([]);
  const [ruleActions, setRuleActions] = useState<RuleAction[]>([]);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);

  // Form states
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showAddAction, setShowAddAction] = useState(false);
  const [newRule, setNewRule] = useState<AutomationRuleCreate>({
    name: "",
    trigger_type: "new_follower",
    action_type: "send_dm",
    platform: "twitter",
  });
  const [newTemplate, setNewTemplate] = useState<ResponseTemplateCreate>({
    name: "",
    category: "welcome",
    content: "",
  });
  const [newAction, setNewAction] = useState<Partial<RuleActionCreate>>({
    action_type: "send_dm",
    delay_minutes: 0,
  });

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadRules(), loadStats(), loadTemplates()]);
    } finally {
      setLoading(false);
    }
  };

  const loadRules = async () => {
    const res = await fetch(`${API_URL}/api/v1/automation/rules`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setRules(await res.json());
    }
  };

  const loadStats = async () => {
    const res = await fetch(`${API_URL}/api/v1/automation/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setStats(await res.json());
    }
  };

  const loadTemplates = async () => {
    const res = await fetch(`${API_URL}/api/v1/automation/templates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setTemplates(await res.json());
    }
  };

  const loadRuleDetails = async (ruleId: string) => {
    const res = await fetch(`${API_URL}/api/v1/automation/rules/${ruleId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setSelectedRule(data.rule);
      setRuleConditions(data.conditions);
      setRuleActions(data.actions);
    }

    // Load logs
    const logsRes = await fetch(
      `${API_URL}/api/v1/automation/rules/${ruleId}/logs`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (logsRes.ok) {
      setExecutionLogs(await logsRes.json());
    }
  };

  const createRule = async () => {
    if (!newRule.name.trim()) return;

    const res = await fetch(`${API_URL}/api/v1/automation/rules`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newRule),
    });

    if (res.ok) {
      const rule = await res.json();
      setNewRule({
        name: "",
        trigger_type: "new_follower",
        action_type: "send_dm",
        platform: "twitter",
      });
      setShowCreateRule(false);
      loadRules();
      loadStats();
      // Open rule details
      setSelectedRule(rule);
      setRuleConditions([]);
      setRuleActions([]);
      setActiveTab("details");
    }
  };

  const deleteRule = async (ruleId: string) => {
    const res = await fetch(`${API_URL}/api/v1/automation/rules/${ruleId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadRules();
      loadStats();
      if (selectedRule?.id === ruleId) {
        setSelectedRule(null);
        setActiveTab("rules");
      }
    }
  };

  const activateRule = async (ruleId: string) => {
    const res = await fetch(
      `${API_URL}/api/v1/automation/rules/${ruleId}/activate`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.ok) {
      loadRules();
      loadStats();
      if (selectedRule?.id === ruleId) {
        loadRuleDetails(ruleId);
      }
    }
  };

  const pauseRule = async (ruleId: string) => {
    const res = await fetch(`${API_URL}/api/v1/automation/rules/${ruleId}/pause`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadRules();
      if (selectedRule?.id === ruleId) {
        loadRuleDetails(ruleId);
      }
    }
  };

  const addAction = async () => {
    if (!selectedRule || !newAction.action_type) return;

    const res = await fetch(
      `${API_URL}/api/v1/automation/rules/${selectedRule.id}/actions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newAction,
          rule_id: selectedRule.id,
        }),
      }
    );

    if (res.ok) {
      setNewAction({ action_type: "send_dm", delay_minutes: 0 });
      setShowAddAction(false);
      loadRuleDetails(selectedRule.id);
    }
  };

  const deleteAction = async (actionId: string) => {
    if (!selectedRule) return;

    const res = await fetch(
      `${API_URL}/api/v1/automation/rules/${selectedRule.id}/actions/${actionId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.ok) {
      loadRuleDetails(selectedRule.id);
    }
  };

  const createTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.content.trim()) return;

    const res = await fetch(`${API_URL}/api/v1/automation/templates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newTemplate),
    });

    if (res.ok) {
      setNewTemplate({ name: "", category: "welcome", content: "" });
      setShowCreateTemplate(false);
      loadTemplates();
      loadStats();
    }
  };

  const deleteTemplate = async (templateId: string) => {
    const res = await fetch(`${API_URL}/api/v1/automation/templates/${templateId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadTemplates();
      loadStats();
    }
  };

  const openRuleDetails = (rule: AutomationRule) => {
    setSelectedRule(rule);
    loadRuleDetails(rule.id);
    setActiveTab("details");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tutorialMode && tutorial && (
        <TutorialPanel tutorial={tutorial} stageId="engagement-automation" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Engagement Automation</h1>
          <p className="text-muted-foreground">
            Set up rules for automated responses and actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateRule(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Zap className="h-4 w-4" />
              Total Rules
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.total_rules || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Play className="h-4 w-4 text-green-500" />
              Active
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.active_rules || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Executions (30d)
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.executions_30d || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Bell className="h-4 w-4" />
              Success Rate
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.success_rate || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Rule Form */}
      {showCreateRule && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Create Automation Rule</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateRule(false)}
            >
              Cancel
            </Button>
          </CardHeader>
          <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Rule Name *</label>
              <Input
                placeholder="e.g., Welcome New Followers"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Platform</label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={newRule.platform || ""}
                onChange={(e) => setNewRule({ ...newRule, platform: e.target.value })}
              >
                <option value="twitter">Twitter</option>
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Trigger</label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={newRule.trigger_type}
                onChange={(e) =>
                  setNewRule({
                    ...newRule,
                    trigger_type: e.target.value as TriggerType,
                  })
                }
              >
                {Object.entries(TRIGGER_LABELS).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Action</label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={newRule.action_type}
                onChange={(e) =>
                  setNewRule({
                    ...newRule,
                    action_type: e.target.value as ActionType,
                  })
                }
              >
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input
                placeholder="What does this rule do?"
                value={newRule.description || ""}
                onChange={(e) =>
                  setNewRule({ ...newRule, description: e.target.value })
                }
              />
            </div>
          </div>
          <Button className="mt-4" onClick={createRule}>
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedRule}>
            Rule Details
          </TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-6">
          {rules.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No automation rules yet</p>
                <p className="text-sm">Create rules to automate your engagement</p>
                <Button className="mt-4" onClick={() => setShowCreateRule(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="divide-y">
              {rules.map((rule) => {
                const TriggerIcon = TRIGGER_LABELS[rule.trigger_type]?.icon || Zap;
                return (
                  <div
                    key={rule.id}
                    className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer"
                    onClick={() => openRuleDetails(rule)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TriggerIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{rule.name}</h4>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              STATUS_COLORS[rule.status]
                            }`}
                          >
                            {rule.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>
                            {TRIGGER_LABELS[rule.trigger_type]?.label || rule.trigger_type}
                          </span>
                          <span>→</span>
                          <span>{ACTION_LABELS[rule.action_type]}</span>
                          {rule.platform && <span>• {rule.platform}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">Executions</p>
                        <p className="font-semibold">{rule.total_executions}</p>
                      </div>
                      <div className="flex gap-2">
                        {rule.status === "paused" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              activateRule(rule.id);
                            }}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Activate
                          </Button>
                        ) : rule.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              pauseRule(rule.id);
                            }}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRule(rule.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </TabsContent>

        {/* Rule Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {selectedRule && (
            <>
              {/* Rule Info */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{selectedRule.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          STATUS_COLORS[selectedRule.status]
                        }`}
                      >
                        {selectedRule.status}
                      </span>
                    </div>
                    {selectedRule.description && (
                      <p className="text-muted-foreground mb-3">
                        {selectedRule.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Trigger: </span>
                        <span className="font-medium">
                          {TRIGGER_LABELS[selectedRule.trigger_type]?.label}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Platform: </span>
                        <span className="font-medium">{selectedRule.platform}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cooldown: </span>
                        <span className="font-medium">
                          {selectedRule.cooldown_minutes} min
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Daily Limit: </span>
                        <span className="font-medium">{selectedRule.daily_limit}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedRule.status === "paused" && (
                      <Button onClick={() => activateRule(selectedRule.id)}>
                        <Play className="h-4 w-4 mr-2" />
                        Activate
                      </Button>
                    )}
                    {selectedRule.status === "active" && (
                      <Button variant="outline" onClick={() => pauseRule(selectedRule.id)}>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </Button>
                    )}
                  </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">Actions ({ruleActions.length})</CardTitle>
                  {selectedRule.status !== "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddAction(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Action
                    </Button>
                  )}
                </CardHeader>
                <CardContent>

                {showAddAction && (
                  <div className="mb-4 p-4 border rounded-lg bg-muted/50">
                    <h5 className="font-medium mb-3">Add Action</h5>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Action Type
                        </label>
                        <select
                          className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                          value={newAction.action_type}
                          onChange={(e) =>
                            setNewAction({
                              ...newAction,
                              action_type: e.target.value as ActionType,
                            })
                          }
                        >
                          {Object.entries(ACTION_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Delay (minutes)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={newAction.delay_minutes || 0}
                          onChange={(e) =>
                            setNewAction({
                              ...newAction,
                              delay_minutes: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                      {(newAction.action_type === "send_dm" ||
                        newAction.action_type === "reply_comment") && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-1 block">
                            Message Template
                          </label>
                          <textarea
                            className="w-full px-3 py-2 border rounded-md bg-background text-sm min-h-[80px]"
                            placeholder="Use {{username}} for personalization"
                            value={newAction.message_template || ""}
                            onChange={(e) =>
                              setNewAction({
                                ...newAction,
                                message_template: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button onClick={addAction}>Add Action</Button>
                      <Button variant="ghost" onClick={() => setShowAddAction(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {ruleActions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No actions configured</p>
                    <p className="text-sm">Add actions to define what happens when the rule triggers</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ruleActions.map((action, index) => (
                      <div
                        key={action.id}
                        className="p-3 border rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground">
                            {index + 1}.
                          </span>
                          <div>
                            <p className="font-medium">
                              {ACTION_LABELS[action.action_type]}
                            </p>
                            {action.delay_minutes > 0 && (
                              <p className="text-sm text-muted-foreground flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {action.delay_minutes} min delay
                              </p>
                            )}
                            {action.message_template && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                "{action.message_template}"
                              </p>
                            )}
                          </div>
                        </div>
                        {selectedRule.status !== "active" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteAction(action.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                </CardContent>
              </Card>

              {/* Execution Logs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Executions</CardTitle>
                </CardHeader>
                <CardContent>
                {executionLogs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No executions yet</p>
                ) : (
                  <div className="space-y-2">
                    {executionLogs.slice(0, 10).map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {log.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span>{log.action_taken}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {new Date(log.executed_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateTemplate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>

          {showCreateTemplate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create Response Template</CardTitle>
              </CardHeader>
              <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Name</label>
                  <Input
                    placeholder="e.g., Welcome Message"
                    value={newTemplate.name}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Category</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                    value={newTemplate.category}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, category: e.target.value })
                    }
                  >
                    <option value="welcome">Welcome</option>
                    <option value="thanks">Thank You</option>
                    <option value="support">Support</option>
                    <option value="promo">Promotional</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Content</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm min-h-[100px]"
                    placeholder="Use {{username}} for personalization"
                    value={newTemplate.content}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, content: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={createTemplate}>Create Template</Button>
                <Button variant="ghost" onClick={() => setShowCreateTemplate(false)}>
                  Cancel
                </Button>
              </div>
              </CardContent>
            </Card>
          )}

          {templates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No templates yet</p>
                <p className="text-sm">Create templates for quick automated responses</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{template.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted">
                        {template.category}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                    {template.content}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Used {template.times_used}x
                  </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {stats?.daily_executions && stats.daily_executions.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Executions Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.daily_executions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#3B82F6"
                      name="Total"
                    />
                    <Line
                      type="monotone"
                      dataKey="successful"
                      stroke="#10B981"
                      name="Successful"
                    />
                  </LineChart>
                </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Performing Rules</CardTitle>
                  </CardHeader>
                  <CardContent>
                  {stats.top_rules?.length > 0 ? (
                    <div className="space-y-3">
                      {stats.top_rules.map((rule, index) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-muted-foreground">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-medium">{rule.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {TRIGGER_LABELS[rule.trigger_type]?.label}
                              </p>
                            </div>
                          </div>
                          <span className="font-semibold">
                            {rule.successful_executions}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No data yet</p>
                  )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Triggers by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                  {Object.keys(stats.trigger_breakdown || {}).length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={Object.entries(stats.trigger_breakdown).map(
                          ([name, value]) => ({
                            name: TRIGGER_LABELS[name as TriggerType]?.label || name,
                            count: value,
                          })
                        )}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-sm">No data yet</p>
                  )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <BarChart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No analytics data yet</p>
                <p className="text-sm">
                  Start running automation rules to see analytics
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
