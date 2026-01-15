import { useState, useEffect } from "react";
import {
  X,
  Save,
  Send,
  Clock,
  Linkedin,
  Twitter,
  Facebook,
  Image,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import type { SocialAccount, SocialPost, SocialPostCreate, SocialPlatform } from "@/types/social";

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

const platformLimits: Record<SocialPlatform, number> = {
  linkedin: 3000,
  twitter: 280,
  facebook: 63206,
};

interface PostFormModalProps {
  accounts: SocialAccount[];
  post: SocialPost | null;
  defaultDate: Date | null;
  onClose: () => void;
  onSaved: () => void;
}

export function PostFormModal({
  accounts,
  post,
  defaultDate,
  onClose,
  onSaved,
}: PostFormModalProps) {
  const [accountId, setAccountId] = useState(post?.account_id || "");
  const [content, setContent] = useState(post?.content || "");
  const [linkUrl, setLinkUrl] = useState(post?.link_url || "");
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (post?.scheduled_at) {
      return post.scheduled_at.slice(0, 16);
    }
    if (defaultDate) {
      const d = new Date(defaultDate);
      d.setHours(9, 0, 0, 0);
      return d.toISOString().slice(0, 16);
    }
    return "";
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const isEditing = Boolean(post?.id);
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const charLimit = selectedAccount ? platformLimits[selectedAccount.platform] : 0;
  const charCount = content.length;
  const isOverLimit = charLimit > 0 && charCount > charLimit;

  const { post: createPost } = useApi<SocialPost>();
  const { patch: updatePost } = useApi<SocialPost>();
  const { post: publishPost } = useApi<{ status: string }>();
  const { post: schedulePost } = useApi<{ status: string }>();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data: SocialPostCreate = {
        account_id: accountId,
        content,
        link_url: linkUrl || undefined,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      };

      if (isEditing) {
        await updatePost(`/social/posts/${post!.id}`, data);
      } else {
        await createPost("/social/posts", data);
      }

      onSaved();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSchedule = async () => {
    if (!post?.id || !scheduledAt) return;
    await schedulePost(
      `/social/posts/${post.id}/schedule?scheduled_at=${new Date(scheduledAt).toISOString()}`,
      {}
    );
    onSaved();
  };

  const handlePublishNow = async () => {
    if (!post?.id) return;
    setIsPublishing(true);
    try {
      await publishPost(`/social/posts/${post.id}/publish`, {});
      onSaved();
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isEditing ? "Edit Post" : "New Post"}
          </h2>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !accountId || !content || isOverLimit}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Account Selection */}
          <div className="space-y-2">
            <Label>Select Account *</Label>
            <div className="flex flex-wrap gap-2">
              {accounts
                .filter((a) => a.status === "connected")
                .map((account) => {
                  const Icon = platformIcons[account.platform];
                  const isSelected = accountId === account.id;
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setAccountId(account.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          platformColors[account.platform]
                        }`}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">
                          {account.platform_username}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {account.platform}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
            {accounts.filter((a) => a.status === "connected").length === 0 && (
              <p className="text-sm text-muted-foreground">
                No connected accounts. Connect an account first.
              </p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Content *</Label>
              {selectedAccount && (
                <span
                  className={`text-sm ${
                    isOverLimit ? "text-red-600" : "text-muted-foreground"
                  }`}
                >
                  {charCount}/{charLimit}
                </span>
              )}
            </div>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want to share?"
              rows={6}
              className={isOverLimit ? "border-red-500" : ""}
            />
            {isOverLimit && (
              <p className="text-sm text-red-600">
                Content exceeds character limit for {selectedAccount?.platform}
              </p>
            )}
          </div>

          {/* Link */}
          <div className="space-y-2">
            <Label htmlFor="link">Link URL (Optional)</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="link"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Preview */}
          {selectedAccount && content && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center gap-2 mb-3">
                  {(() => {
                    const Icon = platformIcons[selectedAccount.platform];
                    return (
                      <>
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            platformColors[selectedAccount.platform]
                          }`}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {selectedAccount.display_name ||
                              selectedAccount.platform_username}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            @{selectedAccount.platform_username}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <p className="whitespace-pre-wrap">{content}</p>
                {linkUrl && (
                  <div className="mt-3 p-3 border rounded bg-white">
                    <p className="text-sm text-blue-600 truncate">{linkUrl}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scheduling */}
          <div className="space-y-2">
            <Label htmlFor="scheduled-at">Schedule (Optional)</Label>
            <Input
              id="scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to save as draft
            </p>
          </div>

          {/* Actions for existing posts */}
          {isEditing && post?.status !== "published" && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleSchedule}
                disabled={!scheduledAt}
                className="flex-1"
              >
                <Clock className="mr-2 h-4 w-4" />
                Schedule
              </Button>
              <Button
                onClick={handlePublishNow}
                disabled={isPublishing}
                className="flex-1"
              >
                {isPublishing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Publish Now
              </Button>
            </div>
          )}

          {/* Status badge for existing posts */}
          {isEditing && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge
                variant={post?.status === "published" ? "default" : "secondary"}
              >
                {post?.status}
              </Badge>
              {post?.platform_post_url && (
                <a
                  href={post.platform_post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View on {selectedAccount?.platform}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
