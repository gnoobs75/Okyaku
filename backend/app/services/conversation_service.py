"""Service for Conversation Intelligence - summarization and analysis."""

import json
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlmodel import Session, select

from app.core.config import settings
from app.models.conversation import (
    ConversationAnalysis,
    ConversationType,
    SentimentType,
    ConversationAnalysisResponse,
)
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


class ConversationService:
    """Service for analyzing conversations and extracting insights."""

    async def analyze_conversation(
        self,
        session: Session,
        type: ConversationType,
        title: str,
        transcript: Optional[str] = None,
        notes: Optional[str] = None,
        contact_id: Optional[UUID] = None,
        deal_id: Optional[UUID] = None,
        activity_id: Optional[UUID] = None,
        occurred_at: Optional[datetime] = None,
        duration_minutes: Optional[int] = None,
        participants: list[str] = [],
    ) -> Optional[ConversationAnalysisResponse]:
        """
        Analyze a conversation transcript or notes.

        Extracts summary, action items, sentiment, key points, and more.
        """
        # Need either transcript or notes
        content = transcript or notes
        if not content:
            logger.error("No content provided for analysis")
            return None

        # Build analysis prompt
        prompt = self._build_analysis_prompt(
            type=type,
            title=title,
            content=content,
            participants=participants,
            duration_minutes=duration_minutes,
        )

        try:
            # Get AI analysis
            result = await llm_service.generate_json(
                prompt=prompt,
                system_message="""You are an expert conversation analyst.
Analyze the provided conversation and extract structured insights.
Focus on actionable information and business-relevant details.
Always respond with valid JSON matching the requested format.""",
            )

            if not result:
                logger.error("Failed to get analysis from LLM")
                return None

            # Parse sentiment
            sentiment_str = result.get("sentiment", "neutral").lower()
            sentiment = SentimentType.NEUTRAL
            if sentiment_str == "positive":
                sentiment = SentimentType.POSITIVE
            elif sentiment_str == "negative":
                sentiment = SentimentType.NEGATIVE
            elif sentiment_str == "mixed":
                sentiment = SentimentType.MIXED

            # Create analysis record
            analysis = ConversationAnalysis(
                contact_id=contact_id,
                deal_id=deal_id,
                activity_id=activity_id,
                type=type,
                title=title,
                occurred_at=occurred_at or datetime.utcnow(),
                duration_minutes=duration_minutes,
                participants=participants,
                transcript=transcript,
                notes=notes,
                summary=result.get("summary", ""),
                key_points=result.get("key_points", []),
                action_items=result.get("action_items", []),
                decisions_made=result.get("decisions_made", []),
                questions_raised=result.get("questions_raised", []),
                follow_up_required=result.get("follow_up_required", False),
                sentiment=sentiment,
                sentiment_score=result.get("sentiment_score", 0.0),
                sentiment_details=result.get("sentiment_details", {}),
                mentioned_people=result.get("mentioned_people", []),
                mentioned_companies=result.get("mentioned_companies", []),
                mentioned_products=result.get("mentioned_products", []),
                mentioned_dates=result.get("mentioned_dates", []),
                mentioned_amounts=result.get("mentioned_amounts", []),
                topics=result.get("topics", []),
                keywords=result.get("keywords", []),
                model_version=settings.OLLAMA_MODEL,
            )

            session.add(analysis)
            session.commit()
            session.refresh(analysis)

            return self._to_response(analysis)

        except Exception as e:
            logger.error(f"Conversation analysis failed: {e}")
            return None

    async def quick_summarize(
        self,
        text: str,
        context: Optional[str] = None,
    ) -> Optional[dict]:
        """
        Quick summarization without full analysis or storage.

        Returns a simple summary and key points.
        """
        context_str = f"\nContext: {context}" if context else ""

        prompt = f"""Summarize the following text concisely.

Text:
{text}
{context_str}

Respond with JSON:
{{
  "summary": "A 2-3 sentence summary",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "action_items": ["Action 1", "Action 2"] // if any mentioned
}}"""

        try:
            result = await llm_service.generate_json(
                prompt=prompt,
                system_message="You are a helpful assistant that summarizes text concisely.",
            )
            return result
        except Exception as e:
            logger.error(f"Quick summarization failed: {e}")
            return None

    async def get_analysis(
        self,
        analysis_id: UUID,
        session: Session,
    ) -> Optional[ConversationAnalysisResponse]:
        """Get a conversation analysis by ID."""
        analysis = session.get(ConversationAnalysis, analysis_id)
        if not analysis:
            return None
        return self._to_response(analysis)

    async def list_analyses(
        self,
        session: Session,
        contact_id: Optional[UUID] = None,
        deal_id: Optional[UUID] = None,
        type: Optional[ConversationType] = None,
        limit: int = 20,
    ) -> list[ConversationAnalysisResponse]:
        """List conversation analyses with optional filters."""
        stmt = select(ConversationAnalysis)

        if contact_id:
            stmt = stmt.where(ConversationAnalysis.contact_id == contact_id)
        if deal_id:
            stmt = stmt.where(ConversationAnalysis.deal_id == deal_id)
        if type:
            stmt = stmt.where(ConversationAnalysis.type == type)

        stmt = stmt.order_by(ConversationAnalysis.occurred_at.desc()).limit(limit)
        analyses = session.exec(stmt).all()

        return [self._to_response(a) for a in analyses]

    async def get_contact_conversation_summary(
        self,
        contact_id: UUID,
        session: Session,
    ) -> dict:
        """Get aggregated conversation insights for a contact."""
        analyses = session.exec(
            select(ConversationAnalysis)
            .where(ConversationAnalysis.contact_id == contact_id)
            .order_by(ConversationAnalysis.occurred_at.desc())
        ).all()

        if not analyses:
            return {
                "total_conversations": 0,
                "recent_summary": None,
                "common_topics": [],
                "sentiment_trend": "neutral",
                "pending_action_items": [],
            }

        # Aggregate insights
        all_topics = []
        all_action_items = []
        sentiment_scores = []

        for analysis in analyses:
            all_topics.extend(analysis.topics)
            all_action_items.extend([
                item for item in analysis.action_items
                if isinstance(item, dict) and not item.get("completed", False)
            ])
            sentiment_scores.append(analysis.sentiment_score)

        # Get most common topics
        topic_counts = {}
        for topic in all_topics:
            topic_counts[topic] = topic_counts.get(topic, 0) + 1
        common_topics = sorted(topic_counts.keys(), key=lambda t: topic_counts[t], reverse=True)[:5]

        # Calculate sentiment trend
        avg_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0
        if avg_sentiment > 0.3:
            sentiment_trend = "positive"
        elif avg_sentiment < -0.3:
            sentiment_trend = "negative"
        else:
            sentiment_trend = "neutral"

        return {
            "total_conversations": len(analyses),
            "recent_summary": analyses[0].summary if analyses else None,
            "last_conversation": analyses[0].occurred_at.isoformat() if analyses else None,
            "common_topics": common_topics,
            "sentiment_trend": sentiment_trend,
            "average_sentiment_score": avg_sentiment,
            "pending_action_items": all_action_items[:10],
        }

    def _build_analysis_prompt(
        self,
        type: ConversationType,
        title: str,
        content: str,
        participants: list[str],
        duration_minutes: Optional[int],
    ) -> str:
        """Build the analysis prompt for the LLM."""
        participants_str = ", ".join(participants) if participants else "Not specified"
        duration_str = f"{duration_minutes} minutes" if duration_minutes else "Not specified"

        return f"""Analyze the following {type.value} conversation and extract structured insights.

Title: {title}
Participants: {participants_str}
Duration: {duration_str}

Content:
{content}

Analyze this conversation and respond with a JSON object containing:
{{
  "summary": "A comprehensive 2-4 sentence summary of the conversation",
  "key_points": ["Key point 1", "Key point 2", ...],
  "action_items": [
    {{"description": "Action description", "assignee": "Person name or null", "due_date": "Date if mentioned or null", "priority": "high/medium/low"}}
  ],
  "decisions_made": ["Decision 1", "Decision 2", ...],
  "questions_raised": ["Question that needs follow-up", ...],
  "follow_up_required": true/false,
  "sentiment": "positive/neutral/negative/mixed",
  "sentiment_score": 0.0, // -1.0 (very negative) to 1.0 (very positive)
  "sentiment_details": {{"overall_tone": "description", "concerns": ["any concerns raised"]}},
  "mentioned_people": ["Person 1", "Person 2", ...],
  "mentioned_companies": ["Company 1", ...],
  "mentioned_products": ["Product/Service 1", ...],
  "mentioned_dates": ["Date/deadline mentioned", ...],
  "mentioned_amounts": ["$10,000", "50 units", ...],
  "topics": ["Topic 1", "Topic 2", ...],
  "keywords": ["keyword1", "keyword2", ...]
}}

Focus on:
1. Extracting actionable items with clear ownership
2. Identifying any commitments or promises made
3. Noting concerns or objections raised
4. Capturing important dates, amounts, and names"""

    def _to_response(self, analysis: ConversationAnalysis) -> ConversationAnalysisResponse:
        """Convert model to response."""
        return ConversationAnalysisResponse(
            id=analysis.id,
            contact_id=analysis.contact_id,
            deal_id=analysis.deal_id,
            activity_id=analysis.activity_id,
            type=analysis.type,
            title=analysis.title,
            occurred_at=analysis.occurred_at,
            duration_minutes=analysis.duration_minutes,
            participants=analysis.participants,
            summary=analysis.summary,
            key_points=analysis.key_points,
            action_items=analysis.action_items,
            decisions_made=analysis.decisions_made,
            questions_raised=analysis.questions_raised,
            follow_up_required=analysis.follow_up_required,
            sentiment=analysis.sentiment,
            sentiment_score=analysis.sentiment_score,
            topics=analysis.topics,
            keywords=analysis.keywords,
            mentioned_people=analysis.mentioned_people,
            mentioned_companies=analysis.mentioned_companies,
            created_at=analysis.created_at,
            analyzed_at=analysis.analyzed_at,
            model_version=analysis.model_version,
        )


# Singleton instance
conversation_service = ConversationService()
