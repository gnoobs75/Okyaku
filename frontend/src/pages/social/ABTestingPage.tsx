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
  FlaskConical,
  Plus,
  Play,
  Pause,
  CheckCircle,
  Trash2,
  RefreshCw,
  Trophy,
  BarChart3,
  TrendingUp,
  Clock,
  Eye,
  Target,
} from "lucide-react";
import {
  ABTest,
  ABTestStats,
  TestVariant,
  TestResults,
  ABTestCreate,
  TestVariantCreate,
  TestStatus,
  TestType,
  WinnerCriteria,
} from "@/types/abTesting";
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
  Legend,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const STATUS_COLORS: Record<TestStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  running: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-purple-100 text-purple-700",
  cancelled: "bg-red-100 text-red-700",
};

const TEST_TYPE_LABELS: Record<TestType, string> = {
  content: "Content",
  timing: "Timing",
  hashtags: "Hashtags",
  media: "Media",
  cta: "Call to Action",
};

const WINNER_CRITERIA_LABELS: Record<WinnerCriteria, string> = {
  engagement_rate: "Engagement Rate",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  clicks: "Clicks",
  reach: "Reach",
  impressions: "Impressions",
};

export function ABTestingPage() {
  const { token } = useAuth();
  const { tutorialMode } = useTutorial();
  const tutorial = getTutorialForStage("ab-testing");
  const [activeTab, setActiveTab] = useState("tests");
  const [loading, setLoading] = useState(true);

  // Data states
  const [tests, setTests] = useState<ABTest[]>([]);
  const [stats, setStats] = useState<ABTestStats | null>(null);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [selectedTestVariants, setSelectedTestVariants] = useState<TestVariant[]>([]);
  const [testResults, setTestResults] = useState<TestResults | null>(null);

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [newTest, setNewTest] = useState<ABTestCreate>({
    name: "",
    description: "",
    test_type: "content",
    platform: "twitter",
    winner_criteria: "engagement_rate",
    min_sample_size: 100,
    duration_hours: 24,
  });
  const [newVariant, setNewVariant] = useState<Partial<TestVariantCreate>>({
    name: "",
    content: "",
    is_control: false,
  });

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadTests(), loadStats()]);
    } finally {
      setLoading(false);
    }
  };

  const loadTests = async () => {
    const res = await fetch(`${API_URL}/api/v1/ab-testing/tests`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setTests(await res.json());
    }
  };

  const loadStats = async () => {
    const res = await fetch(`${API_URL}/api/v1/ab-testing/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setStats(await res.json());
    }
  };

  const loadTestDetails = async (testId: string) => {
    const res = await fetch(`${API_URL}/api/v1/ab-testing/tests/${testId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setSelectedTest(data.test);
      setSelectedTestVariants(data.variants);
    }
  };

  const loadTestResults = async (testId: string) => {
    const res = await fetch(`${API_URL}/api/v1/ab-testing/tests/${testId}/results`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setTestResults(await res.json());
    }
  };

  const createTest = async () => {
    if (!newTest.name.trim()) return;

    const res = await fetch(`${API_URL}/api/v1/ab-testing/tests`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newTest),
    });

    if (res.ok) {
      const test = await res.json();
      setNewTest({
        name: "",
        description: "",
        test_type: "content",
        platform: "twitter",
        winner_criteria: "engagement_rate",
        min_sample_size: 100,
        duration_hours: 24,
      });
      setShowCreateForm(false);
      loadTests();
      loadStats();
      // Open test details
      setSelectedTest(test);
      setSelectedTestVariants([]);
      setActiveTab("details");
    }
  };

  const deleteTest = async (testId: string) => {
    const res = await fetch(`${API_URL}/api/v1/ab-testing/tests/${testId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadTests();
      loadStats();
      if (selectedTest?.id === testId) {
        setSelectedTest(null);
        setSelectedTestVariants([]);
        setActiveTab("tests");
      }
    }
  };

  const startTest = async (testId: string) => {
    const res = await fetch(`${API_URL}/api/v1/ab-testing/tests/${testId}/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadTests();
      loadStats();
      if (selectedTest?.id === testId) {
        loadTestDetails(testId);
      }
    }
  };

  const stopTest = async (testId: string) => {
    const res = await fetch(`${API_URL}/api/v1/ab-testing/tests/${testId}/stop`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadTests();
      if (selectedTest?.id === testId) {
        loadTestDetails(testId);
      }
    }
  };

  const completeTest = async (testId: string) => {
    const res = await fetch(`${API_URL}/api/v1/ab-testing/tests/${testId}/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      loadTests();
      loadStats();
      if (selectedTest?.id === testId) {
        loadTestDetails(testId);
        loadTestResults(testId);
      }
    }
  };

  const addVariant = async () => {
    if (!selectedTest || !newVariant.name || !newVariant.content) return;

    const res = await fetch(
      `${API_URL}/api/v1/ab-testing/tests/${selectedTest.id}/variants`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newVariant,
          test_id: selectedTest.id,
          traffic_percentage: 50,
        }),
      }
    );

    if (res.ok) {
      setNewVariant({ name: "", content: "", is_control: false });
      setShowAddVariant(false);
      loadTestDetails(selectedTest.id);
    }
  };

  const deleteVariant = async (variantId: string) => {
    if (!selectedTest) return;

    const res = await fetch(
      `${API_URL}/api/v1/ab-testing/tests/${selectedTest.id}/variants/${variantId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.ok) {
      loadTestDetails(selectedTest.id);
    }
  };

  const openTestDetails = (test: ABTest) => {
    setSelectedTest(test);
    loadTestDetails(test.id);
    if (test.status === "completed") {
      loadTestResults(test.id);
    }
    setActiveTab("details");
  };

  // Prepare comparison chart data
  const comparisonData = selectedTestVariants.map((v) => ({
    name: v.name,
    impressions: v.impressions,
    likes: v.likes,
    comments: v.comments,
    shares: v.shares,
    engagement_rate: v.engagement_rate || 0,
  }));

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
        <TutorialPanel tutorial={tutorial} stageId="ab-testing" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">A/B Testing</h1>
          <p className="text-muted-foreground">
            Test post variations to optimize performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Test
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <FlaskConical className="h-4 w-4" />
              Total Tests
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.total_tests || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Play className="h-4 w-4 text-green-500" />
              Running
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.running_tests || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle className="h-4 w-4 text-purple-500" />
              Completed
            </div>
            <p className="text-2xl font-bold mt-2">{stats?.completed_tests || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Avg Improvement
            </div>
            <p className="text-2xl font-bold mt-2">
              {stats?.avg_improvement > 0 ? "+" : ""}
              {stats?.avg_improvement || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create Test Form */}
      {showCreateForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Create New A/B Test</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </Button>
          </CardHeader>
          <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Test Name *</label>
              <Input
                placeholder="e.g., CTA Button Test"
                value={newTest.name}
                onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Platform</label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={newTest.platform}
                onChange={(e) => setNewTest({ ...newTest, platform: e.target.value })}
              >
                <option value="twitter">Twitter</option>
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Test Type</label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={newTest.test_type}
                onChange={(e) =>
                  setNewTest({ ...newTest, test_type: e.target.value as TestType })
                }
              >
                {Object.entries(TEST_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Winner Criteria
              </label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                value={newTest.winner_criteria}
                onChange={(e) =>
                  setNewTest({
                    ...newTest,
                    winner_criteria: e.target.value as WinnerCriteria,
                  })
                }
              >
                {Object.entries(WINNER_CRITERIA_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input
                placeholder="What are you testing?"
                value={newTest.description || ""}
                onChange={(e) =>
                  setNewTest({ ...newTest, description: e.target.value })
                }
              />
            </div>
          </div>
          <Button className="mt-4" onClick={createTest}>
            <Plus className="h-4 w-4 mr-2" />
            Create Test
          </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tests">All Tests</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedTest}>
            Test Details
          </TabsTrigger>
          <TabsTrigger
            value="results"
            disabled={!selectedTest || selectedTest.status !== "completed"}
          >
            Results
          </TabsTrigger>
        </TabsList>

        {/* All Tests Tab */}
        <TabsContent value="tests" className="space-y-6">
          {tests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No A/B tests yet</p>
                <p className="text-sm">Create your first test to optimize your content</p>
                <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Test
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="divide-y">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer"
                  onClick={() => openTestDetails(test)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{test.name}</h4>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            STATUS_COLORS[test.status]
                          }`}
                        >
                          {test.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{test.platform}</span>
                        <span>{TEST_TYPE_LABELS[test.test_type]}</span>
                        {test.winning_variant_id && (
                          <span className="flex items-center text-green-600">
                            <Trophy className="h-3 w-3 mr-1" />
                            Winner declared
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {test.status === "draft" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          startTest(test.id);
                        }}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                    {test.status === "running" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            stopTest(test.id);
                          }}
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            completeTest(test.id);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </>
                    )}
                    {test.status === "paused" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startTest(test.id);
                          }}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            completeTest(test.id);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </>
                    )}
                    {test.status !== "running" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTest(test.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>

        {/* Test Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {selectedTest && (
            <>
              {/* Test Info */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{selectedTest.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          STATUS_COLORS[selectedTest.status]
                        }`}
                      >
                        {selectedTest.status}
                      </span>
                    </div>
                    {selectedTest.description && (
                      <p className="text-muted-foreground mb-3">
                        {selectedTest.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Platform: </span>
                        <span className="font-medium">{selectedTest.platform}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type: </span>
                        <span className="font-medium">
                          {TEST_TYPE_LABELS[selectedTest.test_type]}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Winner by: </span>
                        <span className="font-medium">
                          {WINNER_CRITERIA_LABELS[selectedTest.winner_criteria]}
                        </span>
                      </div>
                    </div>
                  </div>
                    <div className="flex gap-2">
                      {selectedTest.status === "draft" && (
                        <Button onClick={() => startTest(selectedTest.id)}>
                          <Play className="h-4 w-4 mr-2" />
                          Start Test
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add Variant Form */}
              {showAddVariant && selectedTest.status === "draft" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add Variant</CardTitle>
                  </CardHeader>
                  <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Variant Name *
                      </label>
                      <Input
                        placeholder="e.g., Variant A, Control"
                        value={newVariant.name || ""}
                        onChange={(e) =>
                          setNewVariant({ ...newVariant, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_control"
                        checked={newVariant.is_control || false}
                        onChange={(e) =>
                          setNewVariant({
                            ...newVariant,
                            is_control: e.target.checked,
                          })
                        }
                      />
                      <label htmlFor="is_control" className="text-sm">
                        This is the control variant
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium mb-1 block">
                        Content *
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm min-h-[100px]"
                        placeholder="Enter the post content for this variant"
                        value={newVariant.content || ""}
                        onChange={(e) =>
                          setNewVariant({ ...newVariant, content: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Hashtags
                      </label>
                      <Input
                        placeholder="#marketing, #growth"
                        value={newVariant.hashtags || ""}
                        onChange={(e) =>
                          setNewVariant({ ...newVariant, hashtags: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        CTA Text
                      </label>
                      <Input
                        placeholder="Learn more"
                        value={newVariant.cta_text || ""}
                        onChange={(e) =>
                          setNewVariant({ ...newVariant, cta_text: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={addVariant}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Variant
                    </Button>
                    <Button variant="ghost" onClick={() => setShowAddVariant(false)}>
                      Cancel
                    </Button>
                  </div>
                  </CardContent>
                </Card>
              )}

              {/* Variants List */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">
                    Variants ({selectedTestVariants.length})
                  </CardTitle>
                  {selectedTest.status === "draft" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddVariant(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Variant
                    </Button>
                  )}
                </CardHeader>
                <CardContent>

                {selectedTestVariants.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No variants yet</p>
                    <p className="text-sm">Add at least 2 variants to run the test</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedTestVariants.map((variant) => (
                      <div
                        key={variant.id}
                        className={`p-4 border rounded-lg ${
                          variant.is_winner
                            ? "border-green-500 bg-green-50"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h5 className="font-semibold">{variant.name}</h5>
                            {variant.is_control && (
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                Control
                              </span>
                            )}
                            {variant.is_winner && (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 flex items-center">
                                <Trophy className="h-3 w-3 mr-1" />
                                Winner
                              </span>
                            )}
                          </div>
                          {selectedTest.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteVariant(variant.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {variant.content}
                        </p>
                        {selectedTest.status !== "draft" && (
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Impressions</p>
                              <p className="font-semibold">
                                {variant.impressions.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Likes</p>
                              <p className="font-semibold">{variant.likes}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Comments</p>
                              <p className="font-semibold">{variant.comments}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Engagement</p>
                              <p className="font-semibold">
                                {variant.engagement_rate?.toFixed(2) || 0}%
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                </CardContent>
              </Card>

              {/* Comparison Chart (for running/completed tests) */}
              {selectedTest.status !== "draft" && comparisonData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="likes" fill="#3B82F6" name="Likes" />
                      <Bar dataKey="comments" fill="#10B981" name="Comments" />
                      <Bar dataKey="shares" fill="#F59E0B" name="Shares" />
                    </BarChart>
                  </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {testResults && (
            <>
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Summary</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Impressions
                    </p>
                    <p className="text-xl font-bold">
                      {testResults.summary.total_impressions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Engagement
                    </p>
                    <p className="text-xl font-bold">
                      {testResults.summary.total_engagement.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="text-xl font-bold">
                      {testResults.summary.duration_hours.toFixed(1)} hours
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Statistical Significance
                    </p>
                    <p className="text-xl font-bold">
                      {testResults.summary.statistical_significance?.toFixed(1) ||
                        "N/A"}
                      %
                    </p>
                  </div>
                </div>
                </CardContent>
              </Card>

              {/* Variant Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Variant Results</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="space-y-4">
                  {testResults.variants.map((result) => (
                    <div
                      key={result.variant.id}
                      className={`p-4 border rounded-lg ${
                        result.is_winner
                          ? "border-green-500 bg-green-50"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{result.variant.name}</h4>
                          {result.is_winner && (
                            <span className="flex items-center text-green-600">
                              <Trophy className="h-4 w-4 mr-1" />
                              Winner
                            </span>
                          )}
                          {result.variant.is_control && (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                              Control
                            </span>
                          )}
                        </div>
                        {result.lift_vs_control !== undefined &&
                          !result.variant.is_control && (
                            <span
                              className={`text-sm font-semibold ${
                                result.lift_vs_control >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {result.lift_vs_control >= 0 ? "+" : ""}
                              {result.lift_vs_control.toFixed(1)}% vs control
                            </span>
                          )}
                      </div>
                      <div className="grid grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Impressions</p>
                          <p className="font-semibold">
                            {result.metrics.impressions.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {result.share_of_impressions.toFixed(1)}% of total
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Engagement Rate</p>
                          <p className="font-semibold">
                            {result.metrics.engagement_rate?.toFixed(2) || 0}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Likes</p>
                          <p className="font-semibold">{result.metrics.likes}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Comments</p>
                          <p className="font-semibold">{result.metrics.comments}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Shares</p>
                          <p className="font-semibold">{result.metrics.shares}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </CardContent>
              </Card>

              {/* Result Summary */}
              {testResults.test.result_summary && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Trophy className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-800">
                        Test Conclusion
                      </h4>
                      <p className="text-green-700">
                        {testResults.test.result_summary}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
