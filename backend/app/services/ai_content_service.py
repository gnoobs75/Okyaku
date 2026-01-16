"""
AI Content Service - Social media content generation using self-hosted Ollama.

This service provides AI-powered content generation for social media posts,
using the local Ollama instance with Llama 3.1 for zero-cost, privacy-first AI.

Features:
- Generate platform-optimized posts (LinkedIn, Twitter, Facebook)
- Create content variations
- Adapt content across platforms
- Improve existing content for engagement
- Generate relevant hashtags
"""

from typing import Optional
from enum import Enum

from app.services.llm_service import llm_service
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class ContentTone(str, Enum):
    """Tone options for generated content."""
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    HUMOROUS = "humorous"
    INSPIRATIONAL = "inspirational"
    EDUCATIONAL = "educational"
    PROMOTIONAL = "promotional"


class ContentLength(str, Enum):
    """Length options for generated content."""
    SHORT = "short"  # ~50-100 chars
    MEDIUM = "medium"  # ~150-250 chars
    LONG = "long"  # ~280-500 chars


class SocialPlatform(str, Enum):
    """Social media platforms for content optimization."""
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    FACEBOOK = "facebook"


PLATFORM_GUIDELINES = {
    SocialPlatform.LINKEDIN: {
        "max_chars": 3000,
        "recommended_chars": 150,
        "style": "Professional, thought leadership focused. Use industry jargon where appropriate. Focus on value, insights, and professional growth.",
        "hashtag_count": "3-5 relevant industry hashtags",
        "emoji_usage": "Minimal, professional emojis only",
    },
    SocialPlatform.TWITTER: {
        "max_chars": 280,
        "recommended_chars": 240,
        "style": "Concise, punchy, conversational. Use hooks and create engagement. Be witty when appropriate.",
        "hashtag_count": "1-2 targeted hashtags",
        "emoji_usage": "Moderate use of relevant emojis",
    },
    SocialPlatform.FACEBOOK: {
        "max_chars": 63206,
        "recommended_chars": 80,
        "style": "Engaging, conversational, community-focused. Encourage comments and shares. Tell stories.",
        "hashtag_count": "1-3 hashtags",
        "emoji_usage": "Moderate to liberal emoji usage",
    },
}


class AIContentService:
    """
    Service for AI-powered social media content generation.

    Uses the LLMService (Ollama + Llama 3.1) for all AI operations.
    """

    async def generate_post(
        self,
        topic: str,
        platform: SocialPlatform,
        tone: ContentTone = ContentTone.PROFESSIONAL,
        length: ContentLength = ContentLength.MEDIUM,
        include_hashtags: bool = True,
        include_emojis: bool = True,
        include_cta: bool = False,
        additional_context: Optional[str] = None,
        brand_voice: Optional[str] = None,
    ) -> dict:
        """
        Generate a social media post using AI.

        Args:
            topic: The main topic or idea for the post
            platform: Target social media platform
            tone: Desired tone of the content
            length: Desired length of the content
            include_hashtags: Whether to include hashtags
            include_emojis: Whether to include emojis
            include_cta: Whether to include a call-to-action
            additional_context: Extra context or requirements
            brand_voice: Description of brand voice/style

        Returns:
            Dict with generated content and metadata
        """
        guidelines = PLATFORM_GUIDELINES[platform]

        # Build the prompts
        system_prompt = self._build_system_prompt(
            platform=platform,
            tone=tone,
            brand_voice=brand_voice,
        )

        user_prompt = self._build_user_prompt(
            topic=topic,
            platform=platform,
            tone=tone,
            length=length,
            include_hashtags=include_hashtags,
            include_emojis=include_emojis,
            include_cta=include_cta,
            additional_context=additional_context,
            guidelines=guidelines,
        )

        # Call the LLM service
        result = await llm_service.chat(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=system_prompt,
        )

        if not result["success"]:
            return {
                "success": False,
                "error": result.get("error", "Unknown error"),
                "platform": platform.value,
            }

        content = result["content"]

        return {
            "success": True,
            "content": content,
            "platform": platform.value,
            "tone": tone.value,
            "length": length.value,
            "char_count": len(content),
            "model": result.get("model", settings.OLLAMA_MODEL),
            "provider": result.get("provider", "ollama"),
            "usage": result.get("usage", {}),
        }

    async def generate_variations(
        self,
        original_content: str,
        platform: SocialPlatform,
        num_variations: int = 3,
        tone: Optional[ContentTone] = None,
    ) -> dict:
        """
        Generate variations of existing content.

        Args:
            original_content: The original post content
            platform: Target social media platform
            num_variations: Number of variations to generate
            tone: Optional tone for variations

        Returns:
            Dict with generated variations
        """
        guidelines = PLATFORM_GUIDELINES[platform]

        system_prompt = """You are an expert social media content strategist.
Your task is to create variations of the given content while maintaining the core message.
Each variation should feel fresh and different while conveying the same key points."""

        user_prompt = f"""Create {num_variations} variations of the following {platform.value} post:

Original content:
"{original_content}"

Requirements:
- Each variation should be unique in structure and wording
- Maintain the core message and intent
- Follow {platform.value} best practices (max {guidelines['max_chars']} chars, recommended {guidelines['recommended_chars']} chars)
- Platform style: {guidelines['style']}
{f"- Use a {tone.value} tone" if tone else ""}

Format your response as:
VARIATION 1:
[content]

VARIATION 2:
[content]

VARIATION 3:
[content]
"""

        result = await llm_service.chat(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=system_prompt,
        )

        if not result["success"]:
            return {
                "success": False,
                "error": result.get("error", "Unknown error"),
                "platform": platform.value,
            }

        # Parse variations from response
        raw_content = result["content"]
        variations = self._parse_variations(raw_content, num_variations)

        return {
            "success": True,
            "variations": variations,
            "platform": platform.value,
            "model": result.get("model", settings.OLLAMA_MODEL),
            "provider": result.get("provider", "ollama"),
            "usage": result.get("usage", {}),
        }

    async def adapt_for_platform(
        self,
        content: str,
        source_platform: SocialPlatform,
        target_platform: SocialPlatform,
    ) -> dict:
        """
        Adapt content from one platform to another.

        Args:
            content: The original content
            source_platform: Platform the content was written for
            target_platform: Platform to adapt content for

        Returns:
            Dict with adapted content
        """
        source_guidelines = PLATFORM_GUIDELINES[source_platform]
        target_guidelines = PLATFORM_GUIDELINES[target_platform]

        system_prompt = """You are an expert social media content strategist specializing in cross-platform content adaptation.
Your task is to adapt content from one platform to another while maintaining the core message and optimizing for the target platform's best practices."""

        user_prompt = f"""Adapt the following {source_platform.value} post for {target_platform.value}:

Original {source_platform.value} content:
"{content}"

Source platform characteristics:
- Max chars: {source_guidelines['max_chars']}
- Style: {source_guidelines['style']}

Target platform ({target_platform.value}) requirements:
- Max chars: {target_guidelines['max_chars']}, recommended: {target_guidelines['recommended_chars']}
- Style: {target_guidelines['style']}
- Hashtags: {target_guidelines['hashtag_count']}
- Emojis: {target_guidelines['emoji_usage']}

Provide ONLY the adapted content, nothing else."""

        result = await llm_service.chat(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=system_prompt,
        )

        if not result["success"]:
            return {
                "success": False,
                "error": result.get("error", "Unknown error"),
                "source_platform": source_platform.value,
                "target_platform": target_platform.value,
            }

        adapted_content = result["content"].strip()

        return {
            "success": True,
            "original_content": content,
            "adapted_content": adapted_content,
            "source_platform": source_platform.value,
            "target_platform": target_platform.value,
            "char_count": len(adapted_content),
            "model": result.get("model", settings.OLLAMA_MODEL),
            "provider": result.get("provider", "ollama"),
            "usage": result.get("usage", {}),
        }

    async def improve_content(
        self,
        content: str,
        platform: SocialPlatform,
        improvement_focus: Optional[str] = None,
    ) -> dict:
        """
        Improve existing content for better engagement.

        Args:
            content: The content to improve
            platform: Target social media platform
            improvement_focus: Specific areas to focus on (e.g., "hook", "cta", "clarity")

        Returns:
            Dict with improved content and suggestions
        """
        guidelines = PLATFORM_GUIDELINES[platform]

        system_prompt = """You are an expert social media content editor.
Your task is to improve the given content for better engagement while maintaining the core message.
Provide the improved version and explain your changes."""

        focus_instruction = f"\nFocus especially on: {improvement_focus}" if improvement_focus else ""

        user_prompt = f"""Improve the following {platform.value} post for better engagement:

Original content:
"{content}"

Platform requirements:
- Max chars: {guidelines['max_chars']}, recommended: {guidelines['recommended_chars']}
- Style: {guidelines['style']}{focus_instruction}

Provide your response in this format:
IMPROVED VERSION:
[improved content]

CHANGES MADE:
- [change 1]
- [change 2]
- [etc.]

ENGAGEMENT TIPS:
- [tip 1]
- [tip 2]"""

        result = await llm_service.chat(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=system_prompt,
        )

        if not result["success"]:
            return {
                "success": False,
                "error": result.get("error", "Unknown error"),
                "platform": platform.value,
            }

        raw_content = result["content"]

        # Parse the response
        improved = self._extract_section(raw_content, "IMPROVED VERSION:")
        changes = self._extract_list_section(raw_content, "CHANGES MADE:")
        tips = self._extract_list_section(raw_content, "ENGAGEMENT TIPS:")

        return {
            "success": True,
            "original_content": content,
            "improved_content": improved,
            "changes": changes,
            "tips": tips,
            "platform": platform.value,
            "model": result.get("model", settings.OLLAMA_MODEL),
            "provider": result.get("provider", "ollama"),
            "usage": result.get("usage", {}),
        }

    async def generate_hashtags(
        self,
        content: str,
        platform: SocialPlatform,
        count: int = 5,
    ) -> dict:
        """
        Generate relevant hashtags for content.

        Args:
            content: The post content
            platform: Target social media platform
            count: Number of hashtags to generate

        Returns:
            Dict with suggested hashtags
        """
        system_prompt = """You are a social media hashtag expert.
Generate relevant, trending, and effective hashtags based on the content provided.
Consider reach, relevance, and engagement potential."""

        user_prompt = f"""Generate {count} hashtags for this {platform.value} post:

"{content}"

Requirements:
- Mix of popular and niche hashtags for optimal reach
- Relevant to the content and industry
- No banned or flagged hashtags
- Appropriate for {platform.value}

Format: Return only the hashtags, one per line, with the # symbol."""

        result = await llm_service.chat(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=system_prompt,
            max_tokens=256,
        )

        if not result["success"]:
            return {
                "success": False,
                "error": result.get("error", "Unknown error"),
                "platform": platform.value,
            }

        raw_content = result["content"]
        hashtags = [
            tag.strip()
            for tag in raw_content.split("\n")
            if tag.strip().startswith("#")
        ]

        return {
            "success": True,
            "hashtags": hashtags[:count],
            "platform": platform.value,
            "model": result.get("model", settings.OLLAMA_MODEL),
            "provider": result.get("provider", "ollama"),
        }

    def _build_system_prompt(
        self,
        platform: SocialPlatform,
        tone: ContentTone,
        brand_voice: Optional[str] = None,
    ) -> str:
        """Build the system prompt for content generation."""
        base_prompt = f"""You are an expert social media content creator specializing in {platform.value}.
Your task is to create engaging, platform-optimized content that drives engagement and conversions.

Your writing style should be {tone.value}.

Key principles:
- Write for humans first, algorithms second
- Lead with value and create genuine engagement
- Use power words and emotional triggers appropriately
- Create clear calls-to-action when appropriate
- Optimize for the specific platform's format and audience"""

        if brand_voice:
            base_prompt += f"\n\nBrand voice guidelines:\n{brand_voice}"

        return base_prompt

    def _build_user_prompt(
        self,
        topic: str,
        platform: SocialPlatform,
        tone: ContentTone,
        length: ContentLength,
        include_hashtags: bool,
        include_emojis: bool,
        include_cta: bool,
        additional_context: Optional[str],
        guidelines: dict,
    ) -> str:
        """Build the user prompt for content generation."""
        length_guidance = {
            ContentLength.SHORT: "Keep it concise, around 50-100 characters",
            ContentLength.MEDIUM: "Medium length, around 150-250 characters",
            ContentLength.LONG: "Longer format, around 280-500 characters",
        }

        prompt = f"""Create a {platform.value} post about: {topic}

Platform requirements:
- Maximum characters: {guidelines['max_chars']}
- Recommended length: {guidelines['recommended_chars']} chars
- Platform style: {guidelines['style']}

Content specifications:
- Length: {length_guidance[length]}
- Tone: {tone.value}
- Hashtags: {"Include " + guidelines['hashtag_count'] if include_hashtags else "Do not include hashtags"}
- Emojis: {guidelines['emoji_usage'] if include_emojis else "Do not use emojis"}
- Call-to-action: {"Include a compelling CTA" if include_cta else "No explicit CTA needed"}"""

        if additional_context:
            prompt += f"\n\nAdditional context:\n{additional_context}"

        prompt += "\n\nProvide ONLY the post content, nothing else."

        return prompt

    def _parse_variations(self, content: str, expected_count: int) -> list[str]:
        """Parse variations from the response."""
        variations = []
        lines = content.split("\n")
        current_variation = []
        in_variation = False

        for line in lines:
            if line.strip().upper().startswith("VARIATION"):
                if current_variation:
                    variations.append("\n".join(current_variation).strip())
                current_variation = []
                in_variation = True
            elif in_variation and line.strip():
                current_variation.append(line)

        if current_variation:
            variations.append("\n".join(current_variation).strip())

        return variations[:expected_count]

    def _extract_section(self, content: str, section_header: str) -> str:
        """Extract a section from formatted response."""
        lines = content.split("\n")
        in_section = False
        section_content = []

        for line in lines:
            if section_header in line.upper():
                in_section = True
                continue
            elif in_section:
                if line.strip() and line.strip().endswith(":") and line.strip().isupper():
                    break
                section_content.append(line)

        return "\n".join(section_content).strip()

    def _extract_list_section(self, content: str, section_header: str) -> list[str]:
        """Extract a list section from formatted response."""
        section = self._extract_section(content, section_header)
        items = []
        for line in section.split("\n"):
            cleaned = line.strip()
            if cleaned.startswith("-") or cleaned.startswith("•"):
                items.append(cleaned[1:].strip())
            elif cleaned:
                items.append(cleaned)
        return items


# Global service instance
ai_content_service = AIContentService()
