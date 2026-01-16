import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  Wand2,
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
  Lightbulb,
  Hash,
  AlertCircle,
  Linkedin,
  Twitter,
  Facebook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/useApi";
import type {
  SocialPlatform,
  ContentTone,
  ContentLength,
  GeneratePostResponse,
  GenerateVariationsResponse,
  AdaptContentResponse,
  ImproveContentResponse,
  GenerateHashtagsResponse,
  AIContentStatus,
} from "@/types/social";

const platformIcons: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  linkedin: Linkedin,
  twitter: Twitter,
  facebook: Facebook,
};

const platformNames: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  facebook: "Facebook",
};

const toneLabels: Record<ContentTone, string> = {
  professional: "Professional",
  casual: "Casual",
  humorous: "Humorous",
  inspirational: "Inspirational",
  educational: "Educational",
  promotional: "Promotional",
};

const lengthLabels: Record<ContentLength, string> = {
  short: "Short (~50-100 chars)",
  medium: "Medium (~150-250 chars)",
  long: "Long (~280-500 chars)",
};

export function AIContentAssistant() {
  const { get, post } = useApi();
  const [status, setStatus] = useState<AIContentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("generate");

  // Generate form state
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<SocialPlatform>("linkedin");
  const [tone, setTone] = useState<ContentTone>("professional");
  const [length, setLength] = useState<ContentLength>("medium");
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeCta, setIncludeCta] = useState(false);
  const [additionalContext, setAdditionalContext] = useState("");
  const [generatedContent, setGeneratedContent] = useState<GeneratePostResponse | null>(null);

  // Variations form state
  const [variationsContent, setVariationsContent] = useState("");
  const [variationsPlatform, setVariationsPlatform] = useState<SocialPlatform>("linkedin");
  const [variationsResult, setVariationsResult] = useState<GenerateVariationsResponse | null>(null);

  // Adapt form state
  const [adaptContent, setAdaptContent] = useState("");
  const [sourcePlatform, setSourcePlatform] = useState<SocialPlatform>("linkedin");
  const [targetPlatform, setTargetPlatform] = useState<SocialPlatform>("twitter");
  const [adaptResult, setAdaptResult] = useState<AdaptContentResponse | null>(null);

  // Improve form state
  const [improveContent, setImproveContent] = useState("");
  const [improvePlatform, setImprovePlatform] = useState<SocialPlatform>("linkedin");
  const [improveFocus, setImproveFocus] = useState("");
  const [improveResult, setImproveResult] = useState<ImproveContentResponse | null>(null);

  // Hashtags form state
  const [hashtagContent, setHashtagContent] = useState("");
  const [hashtagPlatform, setHashtagPlatform] = useState<SocialPlatform>("linkedin");
  const [hashtagCount, setHashtagCount] = useState(5);
  const [hashtagResult, setHashtagResult] = useState<GenerateHashtagsResponse | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const result = await get("/ai/content/status");
      if (result) setStatus(result as AIContentStatus);
    } catch (error) {
      console.error("Failed to fetch AI status:", error);
    }
  }, [get]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedContent(null);
    try {
      const result = await post("/ai/content/generate", {
        topic,
        platform,
        tone,
        length,
        include_hashtags: includeHashtags,
        include_emojis: includeEmojis,
        include_cta: includeCta,
        additional_context: additionalContext || undefined,
      });
      if (result) setGeneratedContent(result as GeneratePostResponse);
    } catch (error) {
      console.error("Failed to generate content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVariations = async () => {
    setLoading(true);
    setVariationsResult(null);
    try {
      const result = await post("/ai/content/variations", {
        content: variationsContent,
        platform: variationsPlatform,
        num_variations: 3,
      });
      if (result) setVariationsResult(result as GenerateVariationsResponse);
    } catch (error) {
      console.error("Failed to generate variations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdapt = async () => {
    setLoading(true);
    setAdaptResult(null);
    try {
      const result = await post("/ai/content/adapt", {
        content: adaptContent,
        source_platform: sourcePlatform,
        target_platform: targetPlatform,
      });
      if (result) setAdaptResult(result as AdaptContentResponse);
    } catch (error) {
      console.error("Failed to adapt content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async () => {
    setLoading(true);
    setImproveResult(null);
    try {
      const result = await post("/ai/content/improve", {
        content: improveContent,
        platform: improvePlatform,
        improvement_focus: improveFocus || undefined,
      });
      if (result) setImproveResult(result as ImproveContentResponse);
    } catch (error) {
      console.error("Failed to improve content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleHashtags = async () => {
    setLoading(true);
    setHashtagResult(null);
    try {
      const result = await post("/ai/content/hashtags", {
        content: hashtagContent,
        platform: hashtagPlatform,
        count: hashtagCount,
      });
      if (result) setHashtagResult(result as GenerateHashtagsResponse);
    } catch (error) {
      console.error("Failed to generate hashtags:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!status?.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Content Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ollama Not Running</h3>
            <p className="text-muted-foreground max-w-md mb-4">
              The AI Content Assistant uses local Ollama with Llama 3.1 for self-hosted,
              privacy-first AI with zero API costs.
            </p>
            {status?.setup_instructions && (
              <div className="text-left bg-muted rounded-lg p-4 max-w-md">
                <p className="font-medium mb-2">{status.setup_instructions.message}</p>
                <ol className="space-y-1 text-sm text-muted-foreground">
                  {status.setup_instructions.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            <Button
              variant="outline"
              className="mt-4"
              onClick={fetchStatus}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Content Assistant
            <Badge variant="outline" className="ml-2 text-xs">Self-Hosted</Badge>
          </CardTitle>
          <CardDescription>
            Generate, improve, and adapt social media content using AI.
            Powered by local Ollama with {status.model} - zero API costs, complete privacy.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="generate" className="flex items-center gap-1">
            <Wand2 className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="variations" className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            Variations
          </TabsTrigger>
          <TabsTrigger value="adapt" className="flex items-center gap-1">
            <ArrowRight className="h-4 w-4" />
            Adapt
          </TabsTrigger>
          <TabsTrigger value="improve" className="flex items-center gap-1">
            <Lightbulb className="h-4 w-4" />
            Improve
          </TabsTrigger>
          <TabsTrigger value="hashtags" className="flex items-center gap-1">
            <Hash className="h-4 w-4" />
            Hashtags
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate New Post</CardTitle>
              <CardDescription>
                Create optimized social media content from a topic or idea
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic or Idea *</Label>
                <Textarea
                  id="topic"
                  placeholder="Describe what you want to post about..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
                  >
                    {Object.entries(platformNames).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as ContentTone)}
                  >
                    {Object.entries(toneLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Length</Label>
                  <Select
                    value={length}
                    onChange={(e) => setLength(e.target.value as ContentLength)}
                  >
                    {Object.entries(lengthLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Options</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={includeHashtags ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setIncludeHashtags(!includeHashtags)}
                    >
                      #Hashtags
                    </Badge>
                    <Badge
                      variant={includeEmojis ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setIncludeEmojis(!includeEmojis)}
                    >
                      Emojis
                    </Badge>
                    <Badge
                      variant={includeCta ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setIncludeCta(!includeCta)}
                    >
                      CTA
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="context">Additional Context (optional)</Label>
                <Input
                  id="context"
                  placeholder="Any specific requirements or context..."
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Post
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {generatedContent?.content && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Generated Content</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedContent.content || "")}
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                  {generatedContent.content}
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span>{generatedContent.char_count} characters</span>
                  {generatedContent.usage && (
                    <span>
                      {generatedContent.usage.input_tokens + generatedContent.usage.output_tokens} tokens used
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Variations Tab */}
        <TabsContent value="variations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Variations</CardTitle>
              <CardDescription>
                Create alternative versions of existing content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Original Content *</Label>
                <Textarea
                  placeholder="Paste your existing post content..."
                  value={variationsContent}
                  onChange={(e) => setVariationsContent(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={variationsPlatform}
                  onChange={(e) => setVariationsPlatform(e.target.value as SocialPlatform)}
                >
                  {Object.entries(platformNames).map(([key, name]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </Select>
              </div>

              <Button
                onClick={handleVariations}
                disabled={loading || !variationsContent.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate 3 Variations
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {variationsResult?.variations && (
            <div className="space-y-4">
              {variationsResult.variations.map((variation, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between py-3">
                    <CardTitle className="text-base">Variation {index + 1}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(variation)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{variation}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Adapt Tab */}
        <TabsContent value="adapt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Adapt for Platform</CardTitle>
              <CardDescription>
                Convert content from one platform to another
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Content to Adapt *</Label>
                <Textarea
                  placeholder="Paste the content you want to adapt..."
                  value={adaptContent}
                  onChange={(e) => setAdaptContent(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Source Platform</Label>
                  <Select
                    value={sourcePlatform}
                    onChange={(e) => setSourcePlatform(e.target.value as SocialPlatform)}
                  >
                    {Object.entries(platformNames).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Platform</Label>
                  <Select
                    value={targetPlatform}
                    onChange={(e) => setTargetPlatform(e.target.value as SocialPlatform)}
                  >
                    {Object.entries(platformNames).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleAdapt}
                disabled={loading || !adaptContent.trim() || sourcePlatform === targetPlatform}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Adapting...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Adapt Content
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {adaptResult?.adapted_content && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Adapted for {platformNames[adaptResult.target_platform]}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(adaptResult.adapted_content || "")}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                  {adaptResult.adapted_content}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {adaptResult.char_count} characters
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Improve Tab */}
        <TabsContent value="improve" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Improve Content</CardTitle>
              <CardDescription>
                Get AI suggestions to improve your content's engagement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Content to Improve *</Label>
                <Textarea
                  placeholder="Paste the content you want to improve..."
                  value={improveContent}
                  onChange={(e) => setImproveContent(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select
                    value={improvePlatform}
                    onChange={(e) => setImprovePlatform(e.target.value as SocialPlatform)}
                  >
                    {Object.entries(platformNames).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Focus Area (optional)</Label>
                  <Input
                    placeholder="e.g., hook, clarity, CTA..."
                    value={improveFocus}
                    onChange={(e) => setImproveFocus(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleImprove}
                disabled={loading || !improveContent.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Improve Content
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {improveResult?.improved_content && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Improved Version</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(improveResult.improved_content || "")}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                    {improveResult.improved_content}
                  </div>
                </CardContent>
              </Card>

              {improveResult.changes && improveResult.changes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Changes Made</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {improveResult.changes.map((change, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {improveResult.tips && improveResult.tips.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Tips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {improveResult.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Hashtags Tab */}
        <TabsContent value="hashtags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Hashtags</CardTitle>
              <CardDescription>
                Get AI-suggested hashtags for your content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Post Content *</Label>
                <Textarea
                  placeholder="Paste your post content..."
                  value={hashtagContent}
                  onChange={(e) => setHashtagContent(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select
                    value={hashtagPlatform}
                    onChange={(e) => setHashtagPlatform(e.target.value as SocialPlatform)}
                  >
                    {Object.entries(platformNames).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Number of Hashtags</Label>
                  <Select
                    value={hashtagCount.toString()}
                    onChange={(e) => setHashtagCount(parseInt(e.target.value))}
                  >
                    {[3, 5, 7, 10].map((num) => (
                      <option key={num} value={num}>{num} hashtags</option>
                    ))}
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleHashtags}
                disabled={loading || !hashtagContent.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Hash className="mr-2 h-4 w-4" />
                    Generate Hashtags
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {hashtagResult?.hashtags && hashtagResult.hashtags.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Suggested Hashtags</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(hashtagResult.hashtags?.join(" ") || "")}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {hashtagResult.hashtags.map((tag, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-base cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => copyToClipboard(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
