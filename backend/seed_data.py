"""
Seed script to populate Okyaku CRM with test data.
Run with: python seed_data.py
"""

import random
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlmodel import Session, select

from app.db.session import engine
from app.core.security import get_password_hash
from app.models.user import User
from app.models.company import Company
from app.models.contact import Contact, ContactStatus
from app.models.deal import Deal
from app.models.pipeline import Pipeline, PipelineStage
from app.models.activity import Activity, ActivityType
from app.models.task import Task, TaskStatus, TaskPriority


def create_users(session: Session) -> dict[str, User]:
    """Create test users."""
    users = {}

    # Check if admin exists
    admin = session.exec(select(User).where(User.username == "admin")).first()
    if not admin:
        admin = User(
            email="admin@okyaku.local",
            username="admin",
            password_hash=get_password_hash("admin123"),
            name="System Administrator",
            is_active=True,
        )
        session.add(admin)
        print("Created admin user (admin / admin123)")
    users["admin"] = admin

    # Check if Charlton Harris exists (might be existing user)
    charlton = session.exec(select(User).where(User.username == "charlton")).first()
    if not charlton:
        charlton = session.exec(select(User).where(User.email.ilike("%charlton%"))).first()
    if not charlton:
        charlton = User(
            email="charlton.harris@okyaku.local",
            username="charlton",
            password_hash=get_password_hash("charlton123"),
            name="Charlton Harris",
            is_active=True,
        )
        session.add(charlton)
        print("Created Charlton Harris user (charlton / charlton123)")
    users["charlton"] = charlton

    # Bobby Langford
    bobby = session.exec(select(User).where(User.username == "bobby")).first()
    if not bobby:
        bobby = User(
            email="bobby.langford@okyaku.local",
            username="bobby",
            password_hash=get_password_hash("bobby123"),
            name="Bobby Langford",
            is_active=True,
        )
        session.add(bobby)
        print("Created Bobby Langford user (bobby / bobby123)")
    users["bobby"] = bobby

    # Sarah Chen
    sarah = session.exec(select(User).where(User.username == "sarah")).first()
    if not sarah:
        sarah = User(
            email="sarah.chen@okyaku.local",
            username="sarah",
            password_hash=get_password_hash("sarah123"),
            name="Sarah Chen",
            is_active=True,
        )
        session.add(sarah)
        print("Created Sarah Chen user (sarah / sarah123)")
    users["sarah"] = sarah

    # Mike Rodriguez
    mike = session.exec(select(User).where(User.username == "mike")).first()
    if not mike:
        mike = User(
            email="mike.rodriguez@okyaku.local",
            username="mike",
            password_hash=get_password_hash("mike123"),
            name="Mike Rodriguez",
            is_active=True,
        )
        session.add(mike)
        print("Created Mike Rodriguez user (mike / mike123)")
    users["mike"] = mike

    session.commit()
    for user in users.values():
        session.refresh(user)

    return users


def create_pipeline(session: Session) -> tuple[Pipeline, list[PipelineStage]]:
    """Create default sales pipeline."""
    pipeline = session.exec(select(Pipeline).where(Pipeline.is_default == True)).first()

    if not pipeline:
        pipeline = Pipeline(
            name="Sales Pipeline",
            description="Standard B2B sales process",
            is_default=True,
            is_active=True,
        )
        session.add(pipeline)
        session.commit()
        session.refresh(pipeline)

        stages_data = [
            ("Lead", 0, 10, False, False),
            ("Qualified", 1, 25, False, False),
            ("Proposal", 2, 50, False, False),
            ("Negotiation", 3, 75, False, False),
            ("Closed Won", 4, 100, True, False),
            ("Closed Lost", 5, 0, False, True),
        ]

        stages = []
        for name, order, probability, is_won, is_lost in stages_data:
            stage = PipelineStage(
                pipeline_id=pipeline.id,
                name=name,
                order=order,
                probability=probability,
                is_won=is_won,
                is_lost=is_lost,
            )
            session.add(stage)
            stages.append(stage)

        session.commit()
        for stage in stages:
            session.refresh(stage)

        print(f"Created pipeline with {len(stages)} stages")
    else:
        stages = list(session.exec(
            select(PipelineStage).where(PipelineStage.pipeline_id == pipeline.id).order_by(PipelineStage.order)
        ).all())
        print(f"Using existing pipeline: {pipeline.name}")

    return pipeline, stages


def create_companies(session: Session, users: dict[str, User]) -> list[Company]:
    """Create test companies."""
    companies_data = [
        {
            "name": "Tesla, Inc.",
            "domain": "tesla.com",
            "industry": "Automotive/Energy",
            "size": "10000+",
            "description": "Electric vehicles, clean energy, and AI company",
            "website": "https://tesla.com",
            "phone": "+1-888-518-3752",
            "address": "3500 Deer Creek Road",
            "city": "Palo Alto",
            "state": "CA",
            "country": "USA",
            "postal_code": "94304",
        },
        {
            "name": "SpaceX",
            "domain": "spacex.com",
            "industry": "Aerospace",
            "size": "10000+",
            "description": "Space exploration and satellite internet",
            "website": "https://spacex.com",
            "phone": "+1-310-363-6000",
            "address": "1 Rocket Road",
            "city": "Hawthorne",
            "state": "CA",
            "country": "USA",
            "postal_code": "90250",
        },
        {
            "name": "Apple Inc.",
            "domain": "apple.com",
            "industry": "Technology",
            "size": "10000+",
            "description": "Consumer electronics and software",
            "website": "https://apple.com",
            "phone": "+1-408-996-1010",
            "address": "One Apple Park Way",
            "city": "Cupertino",
            "state": "CA",
            "country": "USA",
            "postal_code": "95014",
        },
        {
            "name": "Microsoft Corporation",
            "domain": "microsoft.com",
            "industry": "Technology",
            "size": "10000+",
            "description": "Software, cloud computing, and AI",
            "website": "https://microsoft.com",
            "phone": "+1-425-882-8080",
            "address": "One Microsoft Way",
            "city": "Redmond",
            "state": "WA",
            "country": "USA",
            "postal_code": "98052",
        },
        {
            "name": "Amazon.com, Inc.",
            "domain": "amazon.com",
            "industry": "E-commerce/Cloud",
            "size": "10000+",
            "description": "E-commerce and cloud computing",
            "website": "https://amazon.com",
            "phone": "+1-206-266-1000",
            "address": "410 Terry Ave N",
            "city": "Seattle",
            "state": "WA",
            "country": "USA",
            "postal_code": "98109",
        },
        {
            "name": "NVIDIA Corporation",
            "domain": "nvidia.com",
            "industry": "Technology/AI",
            "size": "10000+",
            "description": "GPUs and AI computing",
            "website": "https://nvidia.com",
            "phone": "+1-408-486-2000",
            "address": "2788 San Tomas Expressway",
            "city": "Santa Clara",
            "state": "CA",
            "country": "USA",
            "postal_code": "95051",
        },
        {
            "name": "Stripe, Inc.",
            "domain": "stripe.com",
            "industry": "Fintech",
            "size": "5001-10000",
            "description": "Online payment processing",
            "website": "https://stripe.com",
            "phone": "+1-888-926-2289",
            "address": "354 Oyster Point Blvd",
            "city": "South San Francisco",
            "state": "CA",
            "country": "USA",
            "postal_code": "94080",
        },
        {
            "name": "Salesforce, Inc.",
            "domain": "salesforce.com",
            "industry": "Software/CRM",
            "size": "10000+",
            "description": "Cloud-based CRM software",
            "website": "https://salesforce.com",
            "phone": "+1-415-901-7000",
            "address": "Salesforce Tower, 415 Mission St",
            "city": "San Francisco",
            "state": "CA",
            "country": "USA",
            "postal_code": "94105",
        },
        {
            "name": "Shopify Inc.",
            "domain": "shopify.com",
            "industry": "E-commerce",
            "size": "5001-10000",
            "description": "E-commerce platform",
            "website": "https://shopify.com",
            "phone": "+1-888-746-7439",
            "address": "151 O'Connor Street",
            "city": "Ottawa",
            "state": "ON",
            "country": "Canada",
            "postal_code": "K2P 2L8",
        },
        {
            "name": "Zoom Video Communications",
            "domain": "zoom.us",
            "industry": "Technology",
            "size": "5001-10000",
            "description": "Video communications platform",
            "website": "https://zoom.us",
            "phone": "+1-888-799-9666",
            "address": "55 Almaden Blvd",
            "city": "San Jose",
            "state": "CA",
            "country": "USA",
            "postal_code": "95113",
        },
        {
            "name": "Acme Startup",
            "domain": "acmestartup.io",
            "industry": "Technology",
            "size": "11-50",
            "description": "Emerging tech startup",
            "website": "https://acmestartup.io",
            "phone": "+1-555-123-4567",
            "address": "123 Innovation Way",
            "city": "Austin",
            "state": "TX",
            "country": "USA",
            "postal_code": "78701",
        },
        {
            "name": "Global Logistics Co.",
            "domain": "globallogistics.com",
            "industry": "Logistics",
            "size": "201-500",
            "description": "International shipping and logistics",
            "website": "https://globallogistics.com",
            "phone": "+1-555-987-6543",
            "address": "500 Port Ave",
            "city": "Los Angeles",
            "state": "CA",
            "country": "USA",
            "postal_code": "90012",
        },
    ]

    companies = []
    salespeople = [users["charlton"], users["bobby"], users["sarah"], users["mike"]]

    for i, data in enumerate(companies_data):
        existing = session.exec(select(Company).where(Company.domain == data["domain"])).first()
        if existing:
            companies.append(existing)
            continue

        company = Company(
            owner_id=salespeople[i % len(salespeople)].id,
            **data
        )
        session.add(company)
        companies.append(company)

    session.commit()
    for company in companies:
        session.refresh(company)

    print(f"Created/loaded {len(companies)} companies")
    return companies


def create_contacts(session: Session, users: dict[str, User], companies: list[Company]) -> list[Contact]:
    """Create test contacts."""
    contacts_data = [
        # Tesla contacts
        {"first_name": "Elon", "last_name": "Musk", "email": "elon@tesla.com", "job_title": "CEO", "phone": "+1-888-518-3752", "company_idx": 0, "status": ContactStatus.CUSTOMER},
        {"first_name": "Vaibhav", "last_name": "Taneja", "email": "vaibhav.taneja@tesla.com", "job_title": "CFO", "phone": "+1-888-518-3753", "company_idx": 0, "status": ContactStatus.CUSTOMER},
        {"first_name": "Drew", "last_name": "Baglino", "email": "drew.baglino@tesla.com", "job_title": "SVP Powertrain", "phone": "+1-888-518-3754", "company_idx": 0, "status": ContactStatus.PROSPECT},

        # SpaceX contacts
        {"first_name": "Gwynne", "last_name": "Shotwell", "email": "gwynne@spacex.com", "job_title": "President & COO", "phone": "+1-310-363-6001", "company_idx": 1, "status": ContactStatus.CUSTOMER},
        {"first_name": "Tom", "last_name": "Mueller", "email": "tom.mueller@spacex.com", "job_title": "VP of Propulsion", "phone": "+1-310-363-6002", "company_idx": 1, "status": ContactStatus.PROSPECT},

        # Apple contacts
        {"first_name": "Tim", "last_name": "Cook", "email": "tim.cook@apple.com", "job_title": "CEO", "phone": "+1-408-996-1011", "company_idx": 2, "status": ContactStatus.PROSPECT},
        {"first_name": "Craig", "last_name": "Federighi", "email": "craig@apple.com", "job_title": "SVP Software Engineering", "phone": "+1-408-996-1012", "company_idx": 2, "status": ContactStatus.LEAD},
        {"first_name": "Eddy", "last_name": "Cue", "email": "eddy.cue@apple.com", "job_title": "SVP Services", "phone": "+1-408-996-1013", "company_idx": 2, "status": ContactStatus.LEAD},

        # Microsoft contacts
        {"first_name": "Satya", "last_name": "Nadella", "email": "satya@microsoft.com", "job_title": "CEO", "phone": "+1-425-882-8081", "company_idx": 3, "status": ContactStatus.CUSTOMER},
        {"first_name": "Amy", "last_name": "Hood", "email": "amy.hood@microsoft.com", "job_title": "CFO", "phone": "+1-425-882-8082", "company_idx": 3, "status": ContactStatus.CUSTOMER},
        {"first_name": "Scott", "last_name": "Guthrie", "email": "scott.guthrie@microsoft.com", "job_title": "EVP Cloud + AI", "phone": "+1-425-882-8083", "company_idx": 3, "status": ContactStatus.PROSPECT},

        # Amazon contacts
        {"first_name": "Andy", "last_name": "Jassy", "email": "andy.jassy@amazon.com", "job_title": "CEO", "phone": "+1-206-266-1001", "company_idx": 4, "status": ContactStatus.PROSPECT},
        {"first_name": "Brian", "last_name": "Olsavsky", "email": "brian.olsavsky@amazon.com", "job_title": "CFO", "phone": "+1-206-266-1002", "company_idx": 4, "status": ContactStatus.LEAD},

        # NVIDIA contacts
        {"first_name": "Jensen", "last_name": "Huang", "email": "jensen@nvidia.com", "job_title": "CEO", "phone": "+1-408-486-2001", "company_idx": 5, "status": ContactStatus.CUSTOMER},
        {"first_name": "Colette", "last_name": "Kress", "email": "colette.kress@nvidia.com", "job_title": "CFO", "phone": "+1-408-486-2002", "company_idx": 5, "status": ContactStatus.CUSTOMER},

        # Stripe contacts
        {"first_name": "Patrick", "last_name": "Collison", "email": "patrick@stripe.com", "job_title": "CEO", "phone": "+1-888-926-2290", "company_idx": 6, "status": ContactStatus.LEAD},
        {"first_name": "John", "last_name": "Collison", "email": "john@stripe.com", "job_title": "President", "phone": "+1-888-926-2291", "company_idx": 6, "status": ContactStatus.LEAD},

        # Salesforce contacts
        {"first_name": "Marc", "last_name": "Benioff", "email": "marc@salesforce.com", "job_title": "CEO", "phone": "+1-415-901-7001", "company_idx": 7, "status": ContactStatus.PROSPECT},
        {"first_name": "Amy", "last_name": "Weaver", "email": "amy.weaver@salesforce.com", "job_title": "CFO", "phone": "+1-415-901-7002", "company_idx": 7, "status": ContactStatus.LEAD},

        # Shopify contacts
        {"first_name": "Tobias", "last_name": "Lutke", "email": "tobi@shopify.com", "job_title": "CEO", "phone": "+1-888-746-7440", "company_idx": 8, "status": ContactStatus.LEAD},

        # Zoom contacts
        {"first_name": "Eric", "last_name": "Yuan", "email": "eric.yuan@zoom.us", "job_title": "CEO", "phone": "+1-888-799-9667", "company_idx": 9, "status": ContactStatus.CUSTOMER},

        # Acme Startup contacts
        {"first_name": "Jane", "last_name": "Doe", "email": "jane@acmestartup.io", "job_title": "CEO", "phone": "+1-555-123-4568", "company_idx": 10, "status": ContactStatus.LEAD},
        {"first_name": "John", "last_name": "Smith", "email": "john@acmestartup.io", "job_title": "CTO", "phone": "+1-555-123-4569", "company_idx": 10, "status": ContactStatus.LEAD},

        # Global Logistics contacts
        {"first_name": "Robert", "last_name": "Johnson", "email": "robert@globallogistics.com", "job_title": "VP Operations", "phone": "+1-555-987-6544", "company_idx": 11, "status": ContactStatus.PROSPECT},
        {"first_name": "Maria", "last_name": "Garcia", "email": "maria@globallogistics.com", "job_title": "Director Purchasing", "phone": "+1-555-987-6545", "company_idx": 11, "status": ContactStatus.PROSPECT},
    ]

    contacts = []
    salespeople = [users["charlton"], users["bobby"], users["sarah"], users["mike"]]

    for i, data in enumerate(contacts_data):
        existing = session.exec(select(Contact).where(Contact.email == data["email"])).first()
        if existing:
            contacts.append(existing)
            continue

        company_idx = data.pop("company_idx")
        status = data.pop("status")

        contact = Contact(
            owner_id=salespeople[i % len(salespeople)].id,
            company_id=companies[company_idx].id if company_idx < len(companies) else None,
            status=status,
            source="CRM Import",
            **data
        )
        session.add(contact)
        contacts.append(contact)

    session.commit()
    for contact in contacts:
        session.refresh(contact)

    print(f"Created/loaded {len(contacts)} contacts")
    return contacts


def create_deals(session: Session, users: dict[str, User], companies: list[Company],
                 contacts: list[Contact], pipeline: Pipeline, stages: list[PipelineStage]) -> list[Deal]:
    """Create test deals."""

    # Get stage IDs
    stage_map = {stage.name: stage for stage in stages}

    deals_data = [
        # Charlton's deals
        {"name": "Tesla Enterprise License", "value": 2500000, "company_idx": 0, "contact_idx": 0, "stage": "Negotiation", "owner": "charlton"},
        {"name": "Tesla AI Platform Integration", "value": 1800000, "company_idx": 0, "contact_idx": 1, "stage": "Proposal", "owner": "charlton"},
        {"name": "SpaceX Mission Control Software", "value": 3200000, "company_idx": 1, "contact_idx": 3, "stage": "Qualified", "owner": "charlton"},
        {"name": "Microsoft Azure Partnership", "value": 5000000, "company_idx": 3, "contact_idx": 8, "stage": "Closed Won", "owner": "charlton"},
        {"name": "NVIDIA GPU Cluster Deal", "value": 4500000, "company_idx": 5, "contact_idx": 13, "stage": "Negotiation", "owner": "charlton"},
        {"name": "Zoom Enterprise Expansion", "value": 750000, "company_idx": 9, "contact_idx": 20, "stage": "Closed Won", "owner": "charlton"},

        # Bobby's deals
        {"name": "Apple Services Integration", "value": 8000000, "company_idx": 2, "contact_idx": 5, "stage": "Lead", "owner": "bobby"},
        {"name": "Apple Developer Tools License", "value": 1200000, "company_idx": 2, "contact_idx": 6, "stage": "Qualified", "owner": "bobby"},
        {"name": "Amazon AWS Migration", "value": 6500000, "company_idx": 4, "contact_idx": 11, "stage": "Proposal", "owner": "bobby"},
        {"name": "Stripe Payment Platform", "value": 950000, "company_idx": 6, "contact_idx": 15, "stage": "Lead", "owner": "bobby"},
        {"name": "Salesforce CRM Extension", "value": 1500000, "company_idx": 7, "contact_idx": 17, "stage": "Closed Lost", "owner": "bobby"},
        {"name": "Global Logistics TMS", "value": 450000, "company_idx": 11, "contact_idx": 23, "stage": "Proposal", "owner": "bobby"},

        # Sarah's deals
        {"name": "Tesla Supercharger Network", "value": 12000000, "company_idx": 0, "contact_idx": 2, "stage": "Lead", "owner": "sarah"},
        {"name": "Microsoft Teams Integration", "value": 2200000, "company_idx": 3, "contact_idx": 10, "stage": "Negotiation", "owner": "sarah"},
        {"name": "NVIDIA AI Training Platform", "value": 3800000, "company_idx": 5, "contact_idx": 14, "stage": "Qualified", "owner": "sarah"},
        {"name": "Shopify Commerce Suite", "value": 680000, "company_idx": 8, "contact_idx": 19, "stage": "Proposal", "owner": "sarah"},
        {"name": "Acme Startup Foundation", "value": 125000, "company_idx": 10, "contact_idx": 21, "stage": "Negotiation", "owner": "sarah"},

        # Mike's deals
        {"name": "SpaceX Starlink Integration", "value": 4200000, "company_idx": 1, "contact_idx": 4, "stage": "Proposal", "owner": "mike"},
        {"name": "Amazon Logistics Platform", "value": 3500000, "company_idx": 4, "contact_idx": 12, "stage": "Qualified", "owner": "mike"},
        {"name": "Stripe Enterprise Payments", "value": 1800000, "company_idx": 6, "contact_idx": 16, "stage": "Lead", "owner": "mike"},
        {"name": "Salesforce Analytics Add-on", "value": 850000, "company_idx": 7, "contact_idx": 18, "stage": "Closed Won", "owner": "mike"},
        {"name": "Acme Startup Growth Package", "value": 95000, "company_idx": 10, "contact_idx": 22, "stage": "Closed Lost", "owner": "mike"},
        {"name": "Global Logistics Fleet Tracking", "value": 320000, "company_idx": 11, "contact_idx": 24, "stage": "Qualified", "owner": "mike"},
    ]

    deals = []

    for data in deals_data:
        existing = session.exec(select(Deal).where(Deal.name == data["name"])).first()
        if existing:
            deals.append(existing)
            continue

        stage = stage_map.get(data["stage"], stages[0])
        owner = users[data["owner"]]

        # Random expected close date within next 90 days
        days_offset = random.randint(7, 90)
        expected_close = datetime.now() + timedelta(days=days_offset)

        # For closed deals, set actual close date
        actual_close = None
        if stage.is_won or stage.is_lost:
            actual_close = datetime.now() - timedelta(days=random.randint(1, 30))
            expected_close = actual_close

        deal = Deal(
            name=data["name"],
            value=Decimal(str(data["value"])),
            pipeline_id=pipeline.id,
            stage_id=stage.id,
            company_id=companies[data["company_idx"]].id if data["company_idx"] < len(companies) else None,
            contact_id=contacts[data["contact_idx"]].id if data["contact_idx"] < len(contacts) else None,
            owner_id=owner.id,
            expected_close_date=expected_close.date(),
            actual_close_date=actual_close.date() if actual_close else None,
            description=f"Enterprise deal with {companies[data['company_idx']].name}",
        )
        session.add(deal)
        deals.append(deal)

    session.commit()
    for deal in deals:
        session.refresh(deal)

    print(f"Created/loaded {len(deals)} deals")
    return deals


def create_activities(session: Session, users: dict[str, User], contacts: list[Contact], deals: list[Deal]):
    """Create test activities."""
    activity_types = [ActivityType.CALL, ActivityType.EMAIL, ActivityType.MEETING, ActivityType.NOTE]
    subjects = [
        "Initial discovery call",
        "Product demo scheduled",
        "Pricing discussion",
        "Technical requirements review",
        "Follow-up email sent",
        "Contract review meeting",
        "Stakeholder introduction",
        "Budget approval discussion",
        "Implementation planning",
        "Executive briefing",
    ]

    activities = []
    salespeople = [users["charlton"], users["bobby"], users["sarah"], users["mike"]]

    for i in range(50):
        owner = random.choice(salespeople)
        contact = random.choice(contacts) if contacts else None
        deal = random.choice(deals) if deals and random.random() > 0.3 else None

        activity_date = datetime.now() - timedelta(days=random.randint(0, 60))

        activity = Activity(
            type=random.choice(activity_types),
            subject=random.choice(subjects),
            description=f"Activity notes for {contact.first_name if contact else 'contact'}",
            activity_date=activity_date,
            duration_minutes=random.choice([15, 30, 45, 60, 90]),
            owner_id=owner.id,
            contact_id=contact.id if contact else None,
            company_id=contact.company_id if contact else None,
            deal_id=deal.id if deal else None,
        )
        session.add(activity)
        activities.append(activity)

    session.commit()
    print(f"Created {len(activities)} activities")


def create_tasks(session: Session, users: dict[str, User], contacts: list[Contact], deals: list[Deal]):
    """Create test tasks."""
    task_titles = [
        "Follow up on proposal",
        "Send contract for review",
        "Schedule demo call",
        "Prepare pricing document",
        "Update CRM records",
        "Send thank you note",
        "Review technical requirements",
        "Coordinate with legal team",
        "Prepare presentation deck",
        "Set up implementation call",
    ]

    tasks = []
    salespeople = [users["charlton"], users["bobby"], users["sarah"], users["mike"]]

    for i in range(30):
        assignee = random.choice(salespeople)
        contact = random.choice(contacts) if contacts else None
        deal = random.choice(deals) if deals and random.random() > 0.3 else None

        due_date = datetime.now() + timedelta(days=random.randint(-10, 30))

        status = TaskStatus.COMPLETED if random.random() > 0.6 else (
            TaskStatus.IN_PROGRESS if random.random() > 0.5 else TaskStatus.PENDING
        )

        task = Task(
            title=random.choice(task_titles),
            description=f"Task related to {contact.first_name if contact else 'general work'}",
            due_date=due_date.date(),
            priority=random.choice([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH]),
            status=status,
            assignee_id=assignee.id,
            contact_id=contact.id if contact else None,
            company_id=contact.company_id if contact else None,
            deal_id=deal.id if deal else None,
        )
        session.add(task)
        tasks.append(task)

    session.commit()
    print(f"Created {len(tasks)} tasks")


def main():
    """Main seed function."""
    print("\n" + "="*50)
    print("  Okyaku CRM - Seeding Test Data")
    print("="*50 + "\n")

    with Session(engine) as session:
        # Create users
        print("\n--- Creating Users ---")
        users = create_users(session)

        # Create pipeline
        print("\n--- Creating Pipeline ---")
        pipeline, stages = create_pipeline(session)

        # Create companies
        print("\n--- Creating Companies ---")
        companies = create_companies(session, users)

        # Create contacts
        print("\n--- Creating Contacts ---")
        contacts = create_contacts(session, users, companies)

        # Create deals
        print("\n--- Creating Deals ---")
        deals = create_deals(session, users, companies, contacts, pipeline, stages)

        # Create activities
        print("\n--- Creating Activities ---")
        create_activities(session, users, contacts, deals)

        # Create tasks
        print("\n--- Creating Tasks ---")
        create_tasks(session, users, contacts, deals)

    print("\n" + "="*50)
    print("  Test Data Seeding Complete!")
    print("="*50)
    print("\n  User Accounts Created:")
    print("  -----------------------")
    print("  admin       / admin123     (Administrator)")
    print("  charlton    / charlton123  (Sales Rep - Charlton Harris)")
    print("  bobby       / bobby123     (Sales Rep - Bobby Langford)")
    print("  sarah       / sarah123     (Sales Rep - Sarah Chen)")
    print("  mike        / mike123      (Sales Rep - Mike Rodriguez)")
    print("\n  Note: If you already have a user account, use that to log in.")
    print("        The above are additional test accounts.\n")


if __name__ == "__main__":
    main()
