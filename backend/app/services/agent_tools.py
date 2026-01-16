"""CRM Tools for the AI Agent to use."""

import logging
from datetime import datetime, date
from typing import Optional, Any
from uuid import UUID

from sqlmodel import Session, select

from app.models.contact import Contact, ContactStatus
from app.models.company import Company
from app.models.deal import Deal
from app.models.activity import Activity, ActivityType
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.agent import AgentActionType

logger = logging.getLogger(__name__)


# Tool definitions for OpenAI-style function calling
AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_contacts",
            "description": "Search for contacts by name, email, company, or status. Returns matching contacts with their basic info.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query (name, email, or company name)"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["lead", "prospect", "opportunity", "customer", "churned"],
                        "description": "Filter by contact status"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results",
                        "default": 10
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_contact_details",
            "description": "Get detailed information about a specific contact including their activities, deals, and history.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_id": {
                        "type": "string",
                        "description": "The UUID of the contact"
                    }
                },
                "required": ["contact_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_contact",
            "description": "Create a new contact in the CRM. Requires approval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "first_name": {
                        "type": "string",
                        "description": "First name of the contact"
                    },
                    "last_name": {
                        "type": "string",
                        "description": "Last name of the contact"
                    },
                    "email": {
                        "type": "string",
                        "description": "Email address"
                    },
                    "phone": {
                        "type": "string",
                        "description": "Phone number"
                    },
                    "company_name": {
                        "type": "string",
                        "description": "Company name (will create or link to existing)"
                    },
                    "job_title": {
                        "type": "string",
                        "description": "Job title"
                    },
                    "source": {
                        "type": "string",
                        "enum": ["website", "referral", "linkedin", "cold_outreach", "event", "other"],
                        "description": "Lead source"
                    }
                },
                "required": ["first_name", "last_name", "email"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_contact",
            "description": "Update an existing contact's information. Requires approval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_id": {
                        "type": "string",
                        "description": "The UUID of the contact to update"
                    },
                    "first_name": {"type": "string"},
                    "last_name": {"type": "string"},
                    "email": {"type": "string"},
                    "phone": {"type": "string"},
                    "job_title": {"type": "string"},
                    "status": {
                        "type": "string",
                        "enum": ["lead", "prospect", "opportunity", "customer", "churned"]
                    }
                },
                "required": ["contact_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_deals",
            "description": "Search for deals by name, contact, or stage.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    },
                    "stage": {
                        "type": "string",
                        "description": "Filter by deal stage"
                    },
                    "min_value": {
                        "type": "number",
                        "description": "Minimum deal value"
                    },
                    "limit": {
                        "type": "integer",
                        "default": 10
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_deal_details",
            "description": "Get detailed information about a specific deal.",
            "parameters": {
                "type": "object",
                "properties": {
                    "deal_id": {
                        "type": "string",
                        "description": "The UUID of the deal"
                    }
                },
                "required": ["deal_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_deal",
            "description": "Create a new deal. Requires approval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Deal name"
                    },
                    "value": {
                        "type": "number",
                        "description": "Deal value in dollars"
                    },
                    "contact_id": {
                        "type": "string",
                        "description": "UUID of the associated contact"
                    },
                    "expected_close_date": {
                        "type": "string",
                        "description": "Expected close date (YYYY-MM-DD)"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Deal notes"
                    }
                },
                "required": ["name", "value"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_deal",
            "description": "Update an existing deal. Requires approval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "deal_id": {
                        "type": "string",
                        "description": "The UUID of the deal"
                    },
                    "name": {"type": "string"},
                    "value": {"type": "number"},
                    "stage": {"type": "string"},
                    "expected_close_date": {"type": "string"},
                    "notes": {"type": "string"}
                },
                "required": ["deal_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "log_activity",
            "description": "Log an activity (call, email, meeting, note) for a contact. Requires approval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_id": {
                        "type": "string",
                        "description": "UUID of the contact"
                    },
                    "activity_type": {
                        "type": "string",
                        "enum": ["call", "email", "meeting", "note", "task"],
                        "description": "Type of activity"
                    },
                    "subject": {
                        "type": "string",
                        "description": "Subject/title of the activity"
                    },
                    "description": {
                        "type": "string",
                        "description": "Detailed description"
                    },
                    "deal_id": {
                        "type": "string",
                        "description": "Optional UUID of associated deal"
                    }
                },
                "required": ["contact_id", "activity_type", "subject"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Create a follow-up task. Requires approval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Task title"
                    },
                    "description": {
                        "type": "string",
                        "description": "Task description"
                    },
                    "due_date": {
                        "type": "string",
                        "description": "Due date (YYYY-MM-DD)"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "urgent"],
                        "default": "medium"
                    },
                    "contact_id": {
                        "type": "string",
                        "description": "Associated contact UUID"
                    },
                    "deal_id": {
                        "type": "string",
                        "description": "Associated deal UUID"
                    }
                },
                "required": ["title", "due_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_pipeline_summary",
            "description": "Get a summary of the sales pipeline including deal counts and values by stage.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "draft_email",
            "description": "Draft an email to a contact. Returns the draft for review - does NOT send.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_id": {
                        "type": "string",
                        "description": "UUID of the recipient contact"
                    },
                    "subject": {
                        "type": "string",
                        "description": "Email subject"
                    },
                    "purpose": {
                        "type": "string",
                        "description": "Purpose of the email (e.g., 'follow-up', 'introduction', 'proposal')"
                    },
                    "key_points": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Key points to include in the email"
                    }
                },
                "required": ["contact_id", "subject", "purpose"]
            }
        }
    }
]


def get_tool_action_type(tool_name: str) -> AgentActionType:
    """Determine the action type for approval requirements."""
    read_only_tools = {
        "search_contacts", "get_contact_details", "search_deals",
        "get_deal_details", "get_pipeline_summary"
    }
    create_tools = {"create_contact", "create_deal", "log_activity", "create_task"}
    update_tools = {"update_contact", "update_deal"}

    if tool_name in read_only_tools:
        return AgentActionType.READ_ONLY
    elif tool_name in create_tools:
        return AgentActionType.CREATE
    elif tool_name in update_tools:
        return AgentActionType.UPDATE
    elif tool_name == "draft_email":
        return AgentActionType.SEND
    else:
        return AgentActionType.READ_ONLY


def requires_approval(tool_name: str) -> bool:
    """Check if a tool requires human approval."""
    return get_tool_action_type(tool_name) != AgentActionType.READ_ONLY


class CRMTools:
    """CRM tool implementations for the AI agent."""

    def __init__(self, session: Session):
        self.session = session

    async def execute_tool(self, tool_name: str, tool_input: dict) -> dict:
        """Execute a tool by name and return the result."""
        tool_methods = {
            "search_contacts": self.search_contacts,
            "get_contact_details": self.get_contact_details,
            "create_contact": self.create_contact,
            "update_contact": self.update_contact,
            "search_deals": self.search_deals,
            "get_deal_details": self.get_deal_details,
            "create_deal": self.create_deal,
            "update_deal": self.update_deal,
            "log_activity": self.log_activity,
            "create_task": self.create_task,
            "get_pipeline_summary": self.get_pipeline_summary,
            "draft_email": self.draft_email,
        }

        if tool_name not in tool_methods:
            return {"error": f"Unknown tool: {tool_name}"}

        try:
            return await tool_methods[tool_name](**tool_input)
        except Exception as e:
            logger.error(f"Tool execution error: {tool_name} - {e}")
            return {"error": str(e)}

    async def search_contacts(
        self, query: str, status: Optional[str] = None, limit: int = 10
    ) -> dict:
        """Search for contacts."""
        stmt = select(Contact)

        # Search by name or email
        stmt = stmt.where(
            (Contact.first_name.ilike(f"%{query}%")) |
            (Contact.last_name.ilike(f"%{query}%")) |
            (Contact.email.ilike(f"%{query}%"))
        )

        if status:
            stmt = stmt.where(Contact.status == ContactStatus(status))

        stmt = stmt.limit(limit)
        contacts = self.session.exec(stmt).all()

        return {
            "contacts": [
                {
                    "id": str(c.id),
                    "name": f"{c.first_name} {c.last_name}",
                    "email": c.email,
                    "status": c.status.value if c.status else None,
                    "company": c.company.name if c.company else None,
                }
                for c in contacts
            ],
            "total": len(contacts)
        }

    async def get_contact_details(self, contact_id: str) -> dict:
        """Get detailed contact information."""
        contact = self.session.get(Contact, UUID(contact_id))
        if not contact:
            return {"error": "Contact not found"}

        # Get recent activities
        activities = self.session.exec(
            select(Activity)
            .where(Activity.contact_id == contact.id)
            .order_by(Activity.created_at.desc())
            .limit(5)
        ).all()

        # Get deals
        deals = self.session.exec(
            select(Deal).where(Deal.contact_id == contact.id)
        ).all()

        return {
            "id": str(contact.id),
            "first_name": contact.first_name,
            "last_name": contact.last_name,
            "email": contact.email,
            "phone": contact.phone,
            "job_title": contact.job_title,
            "status": contact.status.value if contact.status else None,
            "source": contact.source.value if contact.source else None,
            "company": contact.company.name if contact.company else None,
            "created_at": contact.created_at.isoformat(),
            "recent_activities": [
                {
                    "type": a.type.value,
                    "subject": a.subject,
                    "date": a.created_at.isoformat()
                }
                for a in activities
            ],
            "deals": [
                {
                    "id": str(d.id),
                    "name": d.name,
                    "value": float(d.value),
                    "stage": d.stage.value if d.stage else None
                }
                for d in deals
            ]
        }

    async def create_contact(
        self,
        first_name: str,
        last_name: str,
        email: str,
        phone: Optional[str] = None,
        company_name: Optional[str] = None,
        job_title: Optional[str] = None,
        source: str = "other"
    ) -> dict:
        """Create a new contact."""
        # Check for existing contact
        existing = self.session.exec(
            select(Contact).where(Contact.email == email)
        ).first()
        if existing:
            return {"error": f"Contact with email {email} already exists", "existing_id": str(existing.id)}

        # Find or create company
        company_id = None
        if company_name:
            company = self.session.exec(
                select(Company).where(Company.name.ilike(company_name))
            ).first()
            if company:
                company_id = company.id
            else:
                new_company = Company(name=company_name)
                self.session.add(new_company)
                self.session.commit()
                self.session.refresh(new_company)
                company_id = new_company.id

        contact = Contact(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            job_title=job_title,
            company_id=company_id,
            source=source if source else "other",
            status=ContactStatus.LEAD,
        )
        self.session.add(contact)
        self.session.commit()
        self.session.refresh(contact)

        return {
            "success": True,
            "contact_id": str(contact.id),
            "message": f"Created contact: {first_name} {last_name}"
        }

    async def update_contact(self, contact_id: str, **updates) -> dict:
        """Update a contact."""
        contact = self.session.get(Contact, UUID(contact_id))
        if not contact:
            return {"error": "Contact not found"}

        for field, value in updates.items():
            if field == "contact_id":
                continue
            if field == "status" and value:
                value = ContactStatus(value)
            if hasattr(contact, field):
                setattr(contact, field, value)

        self.session.add(contact)
        self.session.commit()

        return {
            "success": True,
            "message": f"Updated contact: {contact.first_name} {contact.last_name}"
        }

    async def search_deals(
        self,
        query: Optional[str] = None,
        stage: Optional[str] = None,
        min_value: Optional[float] = None,
        limit: int = 10
    ) -> dict:
        """Search for deals."""
        stmt = select(Deal)

        if query:
            stmt = stmt.where(Deal.name.ilike(f"%{query}%"))
        if min_value:
            stmt = stmt.where(Deal.value >= min_value)

        stmt = stmt.limit(limit)
        deals = self.session.exec(stmt).all()

        return {
            "deals": [
                {
                    "id": str(d.id),
                    "name": d.name,
                    "value": float(d.value),
                    "stage": d.stage.value if d.stage else None,
                    "expected_close": d.expected_close_date.isoformat() if d.expected_close_date else None
                }
                for d in deals
            ],
            "total": len(deals)
        }

    async def get_deal_details(self, deal_id: str) -> dict:
        """Get detailed deal information."""
        deal = self.session.get(Deal, UUID(deal_id))
        if not deal:
            return {"error": "Deal not found"}

        contact = self.session.get(Contact, deal.contact_id) if deal.contact_id else None

        return {
            "id": str(deal.id),
            "name": deal.name,
            "value": float(deal.value),
            "stage": deal.stage.value if deal.stage else None,
            "expected_close_date": deal.expected_close_date.isoformat() if deal.expected_close_date else None,
            "notes": deal.notes,
            "contact": {
                "id": str(contact.id),
                "name": f"{contact.first_name} {contact.last_name}",
                "email": contact.email
            } if contact else None,
            "created_at": deal.created_at.isoformat()
        }

    async def create_deal(
        self,
        name: str,
        value: float,
        contact_id: Optional[str] = None,
        expected_close_date: Optional[str] = None,
        notes: Optional[str] = None
    ) -> dict:
        """Create a new deal."""
        from decimal import Decimal

        deal = Deal(
            name=name,
            value=Decimal(str(value)),
            contact_id=UUID(contact_id) if contact_id else None,
            expected_close_date=date.fromisoformat(expected_close_date) if expected_close_date else None,
            notes=notes,
        )
        self.session.add(deal)
        self.session.commit()
        self.session.refresh(deal)

        return {
            "success": True,
            "deal_id": str(deal.id),
            "message": f"Created deal: {name} (${value})"
        }

    async def update_deal(self, deal_id: str, **updates) -> dict:
        """Update a deal."""
        deal = self.session.get(Deal, UUID(deal_id))
        if not deal:
            return {"error": "Deal not found"}

        for field, value in updates.items():
            if field == "deal_id":
                continue
            if field == "value" and value:
                from decimal import Decimal
                value = Decimal(str(value))
            if field == "expected_close_date" and value:
                value = date.fromisoformat(value)
            if hasattr(deal, field):
                setattr(deal, field, value)

        self.session.add(deal)
        self.session.commit()

        return {
            "success": True,
            "message": f"Updated deal: {deal.name}"
        }

    async def log_activity(
        self,
        contact_id: str,
        activity_type: str,
        subject: str,
        description: Optional[str] = None,
        deal_id: Optional[str] = None
    ) -> dict:
        """Log an activity for a contact."""
        activity = Activity(
            contact_id=UUID(contact_id),
            deal_id=UUID(deal_id) if deal_id else None,
            type=ActivityType(activity_type),
            subject=subject,
            description=description,
        )
        self.session.add(activity)
        self.session.commit()
        self.session.refresh(activity)

        return {
            "success": True,
            "activity_id": str(activity.id),
            "message": f"Logged {activity_type}: {subject}"
        }

    async def create_task(
        self,
        title: str,
        due_date: str,
        description: Optional[str] = None,
        priority: str = "medium",
        contact_id: Optional[str] = None,
        deal_id: Optional[str] = None
    ) -> dict:
        """Create a follow-up task."""
        task = Task(
            title=title,
            description=description,
            due_date=date.fromisoformat(due_date),
            priority=TaskPriority(priority),
            status=TaskStatus.PENDING,
            contact_id=UUID(contact_id) if contact_id else None,
            deal_id=UUID(deal_id) if deal_id else None,
        )
        self.session.add(task)
        self.session.commit()
        self.session.refresh(task)

        return {
            "success": True,
            "task_id": str(task.id),
            "message": f"Created task: {title} (due {due_date})"
        }

    async def get_pipeline_summary(self) -> dict:
        """Get pipeline summary."""
        deals = self.session.exec(select(Deal)).all()

        # Group by stage
        stages: dict[str, list] = {}
        total_value = 0

        for deal in deals:
            stage = deal.stage.value if deal.stage else "unknown"
            if stage not in stages:
                stages[stage] = []
            stages[stage].append({
                "id": str(deal.id),
                "name": deal.name,
                "value": float(deal.value)
            })
            total_value += float(deal.value)

        return {
            "total_deals": len(deals),
            "total_value": total_value,
            "by_stage": {
                stage: {
                    "count": len(deals_in_stage),
                    "value": sum(d["value"] for d in deals_in_stage),
                    "deals": deals_in_stage[:5]  # Top 5 per stage
                }
                for stage, deals_in_stage in stages.items()
            }
        }

    async def draft_email(
        self,
        contact_id: str,
        subject: str,
        purpose: str,
        key_points: Optional[list] = None
    ) -> dict:
        """Draft an email (returns template, doesn't send)."""
        contact = self.session.get(Contact, UUID(contact_id))
        if not contact:
            return {"error": "Contact not found"}

        # This would integrate with the LLM service in practice
        points_text = "\n".join(f"- {p}" for p in (key_points or []))

        return {
            "draft": {
                "to": contact.email,
                "to_name": f"{contact.first_name} {contact.last_name}",
                "subject": subject,
                "purpose": purpose,
                "key_points": key_points or [],
                "note": "This is a draft template. Use AI content generation to create the full email body."
            },
            "message": f"Created email draft for {contact.first_name}"
        }
