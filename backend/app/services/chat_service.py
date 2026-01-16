"""Service for natural language CRM chat queries."""

import json
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlmodel import Session, select, func

from app.core.config import settings
from app.models.contact import Contact, ContactStatus
from app.models.company import Company
from app.models.deal import Deal
from app.models.activity import Activity
from app.models.task import Task
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


class ChatService:
    """Service for natural language CRM queries."""

    async def process_query(
        self,
        query: str,
        session: Session,
        context: Optional[str] = None,
    ) -> dict:
        """
        Process a natural language query about CRM data.

        Returns a structured response with answer and supporting data.
        """
        # First, classify the query intent
        intent = await self._classify_intent(query)

        # Execute query based on intent
        if intent["type"] == "count":
            result = await self._handle_count_query(intent, session)
        elif intent["type"] == "list":
            result = await self._handle_list_query(intent, session)
        elif intent["type"] == "search":
            result = await self._handle_search_query(intent, query, session)
        elif intent["type"] == "stats":
            result = await self._handle_stats_query(intent, session)
        elif intent["type"] == "recent":
            result = await self._handle_recent_query(intent, session)
        elif intent["type"] == "comparison":
            result = await self._handle_comparison_query(intent, session)
        else:
            result = await self._handle_general_query(query, session)

        # Generate natural language response
        response = await self._generate_response(query, result, context)

        return {
            "query": query,
            "intent": intent,
            "result": result,
            "response": response,
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def _classify_intent(self, query: str) -> dict:
        """Classify the intent of a natural language query."""
        prompt = f"""Classify the following CRM query and extract key parameters.

Query: "{query}"

Respond with JSON:
{{
  "type": "count|list|search|stats|recent|comparison|general",
  "entity": "contacts|deals|companies|activities|tasks|pipeline|all",
  "filters": {{
    "status": "string or null",
    "date_range": "today|this_week|this_month|this_quarter|this_year|null",
    "value_min": "number or null",
    "value_max": "number or null",
    "search_term": "string or null"
  }},
  "limit": "number or 10",
  "sort": "created_at|value|name|null",
  "sort_order": "asc|desc"
}}

Examples:
- "How many leads do we have?" -> type: "count", entity: "contacts", filters: {{status: "lead"}}
- "Show me deals over $10,000" -> type: "list", entity: "deals", filters: {{value_min: 10000}}
- "Find contacts at Acme" -> type: "search", entity: "contacts", filters: {{search_term: "Acme"}}
- "What's our pipeline value?" -> type: "stats", entity: "pipeline"
- "Recent activities" -> type: "recent", entity: "activities"
"""

        try:
            result = await llm_service.generate_json(
                prompt=prompt,
                system_message="You classify CRM queries and extract structured parameters. Always respond with valid JSON.",
            )
            return result or {"type": "general", "entity": "all", "filters": {}, "limit": 10}
        except Exception as e:
            logger.error(f"Intent classification failed: {e}")
            return {"type": "general", "entity": "all", "filters": {}, "limit": 10}

    async def _handle_count_query(self, intent: dict, session: Session) -> dict:
        """Handle count queries."""
        entity = intent.get("entity", "contacts")
        filters = intent.get("filters", {})

        if entity == "contacts":
            stmt = select(func.count(Contact.id))
            if filters.get("status"):
                try:
                    status = ContactStatus(filters["status"])
                    stmt = stmt.where(Contact.status == status)
                except ValueError:
                    pass
            count = session.exec(stmt).one()
            return {"type": "count", "entity": "contacts", "count": count, "filters": filters}

        elif entity == "deals":
            stmt = select(func.count(Deal.id))
            if filters.get("value_min"):
                stmt = stmt.where(Deal.value >= filters["value_min"])
            if filters.get("value_max"):
                stmt = stmt.where(Deal.value <= filters["value_max"])
            count = session.exec(stmt).one()
            return {"type": "count", "entity": "deals", "count": count, "filters": filters}

        elif entity == "companies":
            count = session.exec(select(func.count(Company.id))).one()
            return {"type": "count", "entity": "companies", "count": count}

        elif entity == "activities":
            count = session.exec(select(func.count(Activity.id))).one()
            return {"type": "count", "entity": "activities", "count": count}

        elif entity == "tasks":
            count = session.exec(select(func.count(Task.id))).one()
            return {"type": "count", "entity": "tasks", "count": count}

        return {"type": "count", "entity": entity, "count": 0}

    async def _handle_list_query(self, intent: dict, session: Session) -> dict:
        """Handle list queries."""
        entity = intent.get("entity", "contacts")
        filters = intent.get("filters", {})
        limit = min(intent.get("limit", 10), 50)

        if entity == "contacts":
            stmt = select(Contact)
            if filters.get("status"):
                try:
                    status = ContactStatus(filters["status"])
                    stmt = stmt.where(Contact.status == status)
                except ValueError:
                    pass
            stmt = stmt.order_by(Contact.created_at.desc()).limit(limit)
            contacts = session.exec(stmt).all()
            return {
                "type": "list",
                "entity": "contacts",
                "items": [
                    {
                        "id": str(c.id),
                        "name": f"{c.first_name} {c.last_name}",
                        "email": c.email,
                        "status": c.status.value if c.status else None,
                        "company": c.company.name if c.company else None,
                    }
                    for c in contacts
                ],
                "count": len(contacts),
            }

        elif entity == "deals":
            stmt = select(Deal)
            if filters.get("value_min"):
                stmt = stmt.where(Deal.value >= filters["value_min"])
            if filters.get("value_max"):
                stmt = stmt.where(Deal.value <= filters["value_max"])
            stmt = stmt.order_by(Deal.value.desc()).limit(limit)
            deals = session.exec(stmt).all()
            return {
                "type": "list",
                "entity": "deals",
                "items": [
                    {
                        "id": str(d.id),
                        "name": d.name,
                        "value": float(d.value),
                        "stage": d.stage.value if d.stage else None,
                    }
                    for d in deals
                ],
                "count": len(deals),
            }

        return {"type": "list", "entity": entity, "items": [], "count": 0}

    async def _handle_search_query(
        self, intent: dict, query: str, session: Session
    ) -> dict:
        """Handle search queries."""
        entity = intent.get("entity", "contacts")
        search_term = intent.get("filters", {}).get("search_term", "")
        limit = min(intent.get("limit", 10), 50)

        # Extract search term from query if not in filters
        if not search_term:
            # Simple extraction - could be improved with LLM
            words = query.lower().split()
            for keyword in ["find", "search", "look", "for", "at", "named", "called"]:
                if keyword in words:
                    idx = words.index(keyword)
                    if idx + 1 < len(words):
                        search_term = " ".join(words[idx + 1 :])
                        break

        if entity == "contacts" and search_term:
            stmt = select(Contact).where(
                (Contact.first_name.ilike(f"%{search_term}%"))
                | (Contact.last_name.ilike(f"%{search_term}%"))
                | (Contact.email.ilike(f"%{search_term}%"))
            ).limit(limit)
            contacts = session.exec(stmt).all()
            return {
                "type": "search",
                "entity": "contacts",
                "search_term": search_term,
                "items": [
                    {
                        "id": str(c.id),
                        "name": f"{c.first_name} {c.last_name}",
                        "email": c.email,
                        "status": c.status.value if c.status else None,
                    }
                    for c in contacts
                ],
                "count": len(contacts),
            }

        elif entity == "deals" and search_term:
            stmt = select(Deal).where(
                Deal.name.ilike(f"%{search_term}%")
            ).limit(limit)
            deals = session.exec(stmt).all()
            return {
                "type": "search",
                "entity": "deals",
                "search_term": search_term,
                "items": [
                    {
                        "id": str(d.id),
                        "name": d.name,
                        "value": float(d.value),
                        "stage": d.stage.value if d.stage else None,
                    }
                    for d in deals
                ],
                "count": len(deals),
            }

        return {"type": "search", "entity": entity, "search_term": search_term, "items": [], "count": 0}

    async def _handle_stats_query(self, intent: dict, session: Session) -> dict:
        """Handle statistics queries."""
        entity = intent.get("entity", "pipeline")

        if entity in ["pipeline", "deals"]:
            # Get pipeline stats
            deals = session.exec(select(Deal)).all()
            total_value = sum(float(d.value) for d in deals)
            total_count = len(deals)

            # Group by stage
            stages: dict = {}
            for deal in deals:
                stage = deal.stage.value if deal.stage else "unknown"
                if stage not in stages:
                    stages[stage] = {"count": 0, "value": 0}
                stages[stage]["count"] += 1
                stages[stage]["value"] += float(deal.value)

            return {
                "type": "stats",
                "entity": "pipeline",
                "total_deals": total_count,
                "total_value": total_value,
                "by_stage": stages,
            }

        elif entity == "contacts":
            # Group by status
            contacts = session.exec(select(Contact)).all()
            by_status: dict = {}
            for contact in contacts:
                status = contact.status.value if contact.status else "unknown"
                by_status[status] = by_status.get(status, 0) + 1

            return {
                "type": "stats",
                "entity": "contacts",
                "total": len(contacts),
                "by_status": by_status,
            }

        return {"type": "stats", "entity": entity, "data": {}}

    async def _handle_recent_query(self, intent: dict, session: Session) -> dict:
        """Handle recent items queries."""
        entity = intent.get("entity", "activities")
        limit = min(intent.get("limit", 10), 20)

        if entity == "activities":
            activities = session.exec(
                select(Activity).order_by(Activity.created_at.desc()).limit(limit)
            ).all()
            return {
                "type": "recent",
                "entity": "activities",
                "items": [
                    {
                        "id": str(a.id),
                        "type": a.type.value,
                        "subject": a.subject,
                        "date": a.created_at.isoformat(),
                    }
                    for a in activities
                ],
                "count": len(activities),
            }

        elif entity == "deals":
            deals = session.exec(
                select(Deal).order_by(Deal.created_at.desc()).limit(limit)
            ).all()
            return {
                "type": "recent",
                "entity": "deals",
                "items": [
                    {
                        "id": str(d.id),
                        "name": d.name,
                        "value": float(d.value),
                        "created": d.created_at.isoformat(),
                    }
                    for d in deals
                ],
                "count": len(deals),
            }

        elif entity == "contacts":
            contacts = session.exec(
                select(Contact).order_by(Contact.created_at.desc()).limit(limit)
            ).all()
            return {
                "type": "recent",
                "entity": "contacts",
                "items": [
                    {
                        "id": str(c.id),
                        "name": f"{c.first_name} {c.last_name}",
                        "email": c.email,
                        "created": c.created_at.isoformat(),
                    }
                    for c in contacts
                ],
                "count": len(contacts),
            }

        return {"type": "recent", "entity": entity, "items": [], "count": 0}

    async def _handle_comparison_query(self, intent: dict, session: Session) -> dict:
        """Handle comparison queries (e.g., this month vs last month)."""
        # For now, return basic comparison data
        return {"type": "comparison", "data": "Comparison queries coming soon"}

    async def _handle_general_query(self, query: str, session: Session) -> dict:
        """Handle general/unclassified queries with LLM assistance."""
        # Get some context data
        contact_count = session.exec(select(func.count(Contact.id))).one()
        deal_count = session.exec(select(func.count(Deal.id))).one()
        deals = session.exec(select(Deal).limit(10)).all()
        total_pipeline = sum(float(d.value) for d in deals)

        context = f"""CRM Summary:
- Total contacts: {contact_count}
- Total deals: {deal_count}
- Pipeline value: ${total_pipeline:,.2f}
"""

        return {
            "type": "general",
            "context": context,
            "message": "I'll help answer your question about the CRM data.",
        }

    async def _generate_response(
        self,
        query: str,
        result: dict,
        context: Optional[str] = None,
    ) -> str:
        """Generate a natural language response based on query results."""
        result_type = result.get("type", "general")

        # For simple queries, generate response directly
        if result_type == "count":
            entity = result.get("entity", "items")
            count = result.get("count", 0)
            return f"You have {count} {entity}."

        elif result_type == "list":
            entity = result.get("entity", "items")
            count = result.get("count", 0)
            items = result.get("items", [])

            if count == 0:
                return f"No {entity} found matching your criteria."

            response = f"Found {count} {entity}:\n"
            for item in items[:5]:
                if entity == "contacts":
                    response += f"• {item['name']} ({item.get('email', 'No email')})\n"
                elif entity == "deals":
                    response += f"• {item['name']} - ${item['value']:,.0f}\n"
            if count > 5:
                response += f"... and {count - 5} more."
            return response

        elif result_type == "search":
            entity = result.get("entity", "items")
            search_term = result.get("search_term", "")
            count = result.get("count", 0)

            if count == 0:
                return f"No {entity} found matching '{search_term}'."

            items = result.get("items", [])
            response = f"Found {count} {entity} matching '{search_term}':\n"
            for item in items[:5]:
                if entity == "contacts":
                    response += f"• {item['name']} ({item.get('email', '')})\n"
                elif entity == "deals":
                    response += f"• {item['name']} - ${item['value']:,.0f}\n"
            return response

        elif result_type == "stats":
            entity = result.get("entity", "")
            if entity == "pipeline":
                total_deals = result.get("total_deals", 0)
                total_value = result.get("total_value", 0)
                stages = result.get("by_stage", {})

                response = f"Pipeline Overview:\n"
                response += f"• Total deals: {total_deals}\n"
                response += f"• Total value: ${total_value:,.0f}\n\n"
                response += "By stage:\n"
                for stage, data in stages.items():
                    response += f"• {stage.title()}: {data['count']} deals (${data['value']:,.0f})\n"
                return response

            elif entity == "contacts":
                total = result.get("total", 0)
                by_status = result.get("by_status", {})
                response = f"Contact Overview:\n"
                response += f"• Total contacts: {total}\n\n"
                response += "By status:\n"
                for status, count in by_status.items():
                    response += f"• {status.title()}: {count}\n"
                return response

        elif result_type == "recent":
            entity = result.get("entity", "items")
            items = result.get("items", [])
            count = result.get("count", 0)

            if count == 0:
                return f"No recent {entity} found."

            response = f"Recent {entity}:\n"
            for item in items[:5]:
                if entity == "activities":
                    response += f"• {item['type'].title()}: {item.get('subject', 'No subject')}\n"
                elif entity == "deals":
                    response += f"• {item['name']} - ${item['value']:,.0f}\n"
                elif entity == "contacts":
                    response += f"• {item['name']} ({item.get('email', '')})\n"
            return response

        # For complex queries, use LLM to generate response
        prompt = f"""Based on the following query and data, generate a helpful natural language response.

User Query: "{query}"

Data:
{json.dumps(result, indent=2, default=str)}

{f"Additional Context: {context}" if context else ""}

Generate a clear, concise response that answers the user's question.
"""

        try:
            response = await llm_service.chat(
                messages=[{"role": "user", "content": prompt}],
                system_message="You are a helpful CRM assistant. Generate clear, concise responses about CRM data.",
            )
            return response or "I couldn't generate a response. Please try rephrasing your question."
        except Exception as e:
            logger.error(f"Failed to generate response: {e}")
            return "I understood your query but couldn't generate a detailed response."


# Singleton instance
chat_service = ChatService()
