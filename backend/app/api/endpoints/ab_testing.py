"""API endpoints for A/B testing."""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
import math

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.ab_testing import (
    ABTest,
    ABTestCreate,
    ABTestRead,
    ABTestUpdate,
    TestVariant,
    TestVariantCreate,
    TestVariantRead,
    TestVariantUpdate,
    TestResultSnapshot,
    TestResultSnapshotRead,
    TestStatus,
    WinnerCriteria,
)

router = APIRouter()


# ==================== A/B Tests ====================

@router.get("/tests")
async def list_tests(
    session: SessionDep,
    current_user: CurrentUserDep,
    status: Optional[TestStatus] = None,
    platform: Optional[str] = None,
) -> list[ABTestRead]:
    """List all A/B tests."""
    user_id = UUID(current_user.sub)

    query = select(ABTest).where(ABTest.owner_id == user_id)

    if status:
        query = query.where(ABTest.status == status)

    if platform:
        query = query.where(ABTest.platform == platform)

    query = query.order_by(ABTest.created_at.desc())
    tests = session.exec(query).all()

    return [ABTestRead.model_validate(t) for t in tests]


@router.post("/tests")
async def create_test(
    session: SessionDep,
    current_user: CurrentUserDep,
    test: ABTestCreate,
) -> ABTestRead:
    """Create a new A/B test."""
    user_id = UUID(current_user.sub)

    db_test = ABTest(
        **test.model_dump(),
        owner_id=user_id,
    )
    session.add(db_test)
    session.commit()
    session.refresh(db_test)

    return ABTestRead.model_validate(db_test)


@router.get("/tests/{test_id}")
async def get_test(
    session: SessionDep,
    current_user: CurrentUserDep,
    test_id: UUID,
) -> dict:
    """Get a specific A/B test with its variants."""
    user_id = UUID(current_user.sub)

    test = session.exec(
        select(ABTest).where(
            ABTest.id == test_id,
            ABTest.owner_id == user_id,
        )
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Get variants
    variants = session.exec(
        select(TestVariant).where(TestVariant.test_id == test_id)
    ).all()

    return {
        "test": ABTestRead.model_validate(test),
        "variants": [TestVariantRead.model_validate(v) for v in variants],
    }


@router.patch("/tests/{test_id}")
async def update_test(
    session: SessionDep,
    current_user: CurrentUserDep,
    test_id: UUID,
    update: ABTestUpdate,
) -> ABTestRead:
    """Update an A/B test."""
    user_id = UUID(current_user.sub)

    test = session.exec(
        select(ABTest).where(
            ABTest.id == test_id,
            ABTest.owner_id == user_id,
        )
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    if test.status in [TestStatus.RUNNING, TestStatus.COMPLETED]:
        raise HTTPException(
            status_code=400,
            detail="Cannot modify a running or completed test"
        )

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(test, key, value)

    test.updated_at = datetime.utcnow()
    session.add(test)
    session.commit()
    session.refresh(test)

    return ABTestRead.model_validate(test)


@router.delete("/tests/{test_id}")
async def delete_test(
    session: SessionDep,
    current_user: CurrentUserDep,
    test_id: UUID,
) -> dict:
    """Delete an A/B test and its variants."""
    user_id = UUID(current_user.sub)

    test = session.exec(
        select(ABTest).where(
            ABTest.id == test_id,
            ABTest.owner_id == user_id,
        )
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    if test.status == TestStatus.RUNNING:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a running test. Stop it first."
        )

    # Delete variants
    for v in session.exec(
        select(TestVariant).where(TestVariant.test_id == test_id)
    ).all():
        session.delete(v)

    # Delete snapshots
    for s in session.exec(
        select(TestResultSnapshot).where(TestResultSnapshot.test_id == test_id)
    ).all():
        session.delete(s)

    session.delete(test)
    session.commit()

    return {"success": True, "message": "Test deleted"}


@router.post("/tests/{test_id}/start")
async def start_test(
    session: SessionDep,
    current_user: CurrentUserDep,
    test_id: UUID,
) -> ABTestRead:
    """Start running an A/B test."""
    user_id = UUID(current_user.sub)

    test = session.exec(
        select(ABTest).where(
            ABTest.id == test_id,
            ABTest.owner_id == user_id,
        )
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    if test.status not in [TestStatus.DRAFT, TestStatus.SCHEDULED, TestStatus.PAUSED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot start test in {test.status} status"
        )

    # Verify at least 2 variants exist
    variant_count = session.exec(
        select(func.count()).where(TestVariant.test_id == test_id)
    ).one()

    if variant_count < 2:
        raise HTTPException(
            status_code=400,
            detail="A/B test requires at least 2 variants"
        )

    test.status = TestStatus.RUNNING
    test.started_at = datetime.utcnow()
    test.updated_at = datetime.utcnow()
    session.add(test)
    session.commit()
    session.refresh(test)

    return ABTestRead.model_validate(test)


@router.post("/tests/{test_id}/stop")
async def stop_test(
    session: SessionDep,
    current_user: CurrentUserDep,
    test_id: UUID,
) -> ABTestRead:
    """Stop a running A/B test."""
    user_id = UUID(current_user.sub)

    test = session.exec(
        select(ABTest).where(
            ABTest.id == test_id,
            ABTest.owner_id == user_id,
        )
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    if test.status != TestStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Test is not running")

    test.status = TestStatus.PAUSED
    test.updated_at = datetime.utcnow()
    session.add(test)
    session.commit()
    session.refresh(test)

    return ABTestRead.model_validate(test)


@router.post("/tests/{test_id}/complete")
async def complete_test(
    session: SessionDep,
    current_user: CurrentUserDep,
    test_id: UUID,
    declare_winner: Optional[UUID] = None,
) -> ABTestRead:
    """Complete an A/B test and optionally declare a winner."""
    user_id = UUID(current_user.sub)

    test = session.exec(
        select(ABTest).where(
            ABTest.id == test_id,
            ABTest.owner_id == user_id,
        )
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    if test.status not in [TestStatus.RUNNING, TestStatus.PAUSED]:
        raise HTTPException(
            status_code=400,
            detail="Test must be running or paused to complete"
        )

    # Get variants
    variants = session.exec(
        select(TestVariant).where(TestVariant.test_id == test_id)
    ).all()

    # Determine winner
    winner = None
    if declare_winner:
        winner = next((v for v in variants if v.id == declare_winner), None)
    elif test.auto_select_winner:
        # Auto-select based on winner criteria
        if test.winner_criteria == WinnerCriteria.ENGAGEMENT_RATE:
            winner = max(variants, key=lambda v: v.engagement_rate or 0, default=None)
        elif test.winner_criteria == WinnerCriteria.LIKES:
            winner = max(variants, key=lambda v: v.likes, default=None)
        elif test.winner_criteria == WinnerCriteria.COMMENTS:
            winner = max(variants, key=lambda v: v.comments, default=None)
        elif test.winner_criteria == WinnerCriteria.SHARES:
            winner = max(variants, key=lambda v: v.shares, default=None)
        elif test.winner_criteria == WinnerCriteria.CLICKS:
            winner = max(variants, key=lambda v: v.clicks, default=None)
        elif test.winner_criteria == WinnerCriteria.REACH:
            winner = max(variants, key=lambda v: v.reach, default=None)
        elif test.winner_criteria == WinnerCriteria.IMPRESSIONS:
            winner = max(variants, key=lambda v: v.impressions, default=None)

    if winner:
        test.winning_variant_id = winner.id
        winner.is_winner = True
        session.add(winner)

        # Calculate statistical significance (simplified)
        total_impressions = sum(v.impressions for v in variants)
        if total_impressions > 0:
            test.statistical_significance = min(
                99.9,
                50 + (total_impressions / test.min_sample_size) * 25
            )

        # Generate summary
        test.result_summary = (
            f"Winner: {winner.name} with "
            f"{winner.engagement_rate:.2f}% engagement rate, "
            f"{winner.likes} likes, {winner.comments} comments"
        )

    test.status = TestStatus.COMPLETED
    test.completed_at = datetime.utcnow()
    test.updated_at = datetime.utcnow()
    session.add(test)
    session.commit()
    session.refresh(test)

    return ABTestRead.model_validate(test)


# ==================== Test Variants ====================

@router.post("/tests/{test_id}/variants")
async def create_variant(
    session: SessionDep,
    current_user: CurrentUserDep,
    test_id: UUID,
    variant: TestVariantCreate,
) -> TestVariantRead:
    """Add a variant to an A/B test."""
    user_id = UUID(current_user.sub)

    # Verify test exists and is owned by user
    test = session.exec(
        select(ABTest).where(
            ABTest.id == test_id,
            ABTest.owner_id == user_id,
        )
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    if test.status not in [TestStatus.DRAFT, TestStatus.SCHEDULED]:
        raise HTTPException(
            status_code=400,
            detail="Cannot add variants to a running or completed test"
        )

    # Create variant
    db_variant = TestVariant(
        **{**variant.model_dump(), "test_id": test_id},
        owner_id=user_id,
    )
    session.add(db_variant)
    session.commit()
    session.refresh(db_variant)

    return TestVariantRead.model_validate(db_variant)


@router.patch("/tests/{test_id}/variants/{variant_id}")
async def update_variant(
    session: SessionDep,
    current_user: CurrentUserDep,
    test_id: UUID,
    variant_id: UUID,
    update: TestVariantUpdate,
) -> TestVariantRead:
    """Update a test variant."""
    user_id = UUID(current_user.sub)

    variant = session.exec(
        select(TestVariant).where(
            TestVariant.id == variant_id,
            TestVariant.test_id == test_id,
            TestVariant.owner_id == user_id,
        )
    ).first()

    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    # Verify test is not running
    test = session.exec(
        select(ABTest).where(ABTest.id == test_id)
    ).first()

    if test and test.status in [TestStatus.RUNNING, TestStatus.COMPLETED]:
        raise HTTPException(
            status_code=400,
            detail="Cannot modify variants of a running or completed test"
        )

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(variant, key, value)

    variant.updated_at = datetime.utcnow()
    session.add(variant)
    session.commit()
    session.refresh(variant)

    return TestVariantRead.model_validate(variant)


@router.delete("/tests/{test_id}/variants/{variant_id}")
async def delete_variant(
    session: SessionDep,
    current_user: CurrentUserDep,
    test_id: UUID,
    variant_id: UUID,
) -> dict:
    """Delete a test variant."""
    user_id = UUID(current_user.sub)

    variant = session.exec(
        select(TestVariant).where(
            TestVariant.id == variant_id,
            TestVariant.test_id == test_id,
            TestVariant.owner_id == user_id,
        )
    ).first()

    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    # Verify test is not running
    test = session.exec(
        select(ABTest).where(ABTest.id == test_id)
    ).first()

    if test and test.status in [TestStatus.RUNNING, TestStatus.COMPLETED]:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete variants of a running or completed test"
        )

    session.delete(variant)
    session.commit()

    return {"success": True, "message": "Variant deleted"}


# ==================== Results & Analytics ====================

@router.get("/tests/{test_id}/results")
async def get_test_results(
    session: SessionDep,
    current_user: CurrentUserDep,
    test_id: UUID,
) -> dict:
    """Get detailed results for an A/B test."""
    user_id = UUID(current_user.sub)

    test = session.exec(
        select(ABTest).where(
            ABTest.id == test_id,
            ABTest.owner_id == user_id,
        )
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Get variants with their metrics
    variants = session.exec(
        select(TestVariant).where(TestVariant.test_id == test_id)
    ).all()

    # Get historical snapshots
    snapshots = session.exec(
        select(TestResultSnapshot)
        .where(TestResultSnapshot.test_id == test_id)
        .order_by(TestResultSnapshot.recorded_at.asc())
    ).all()

    # Calculate comparative stats
    total_impressions = sum(v.impressions for v in variants)
    total_engagement = sum(v.likes + v.comments + v.shares for v in variants)

    variant_results = []
    for v in variants:
        # Calculate lift vs control
        control = next((x for x in variants if x.is_control), None)
        lift = None
        if control and control.engagement_rate and v.engagement_rate:
            lift = ((v.engagement_rate - control.engagement_rate) / control.engagement_rate) * 100

        variant_results.append({
            "variant": TestVariantRead.model_validate(v),
            "metrics": {
                "impressions": v.impressions,
                "reach": v.reach,
                "likes": v.likes,
                "comments": v.comments,
                "shares": v.shares,
                "clicks": v.clicks,
                "engagement_rate": v.engagement_rate,
            },
            "share_of_impressions": (
                (v.impressions / total_impressions * 100)
                if total_impressions > 0 else 0
            ),
            "lift_vs_control": lift,
            "is_winner": v.is_winner,
        })

    # Group snapshots by variant for timeline
    timeline_data = {}
    for s in snapshots:
        variant_id = str(s.variant_id)
        if variant_id not in timeline_data:
            timeline_data[variant_id] = []
        timeline_data[variant_id].append({
            "recorded_at": s.recorded_at.isoformat(),
            "impressions": s.impressions,
            "engagement_rate": s.engagement_rate,
            "confidence": s.confidence,
        })

    return {
        "test": ABTestRead.model_validate(test),
        "summary": {
            "total_impressions": total_impressions,
            "total_engagement": total_engagement,
            "duration_hours": (
                (test.completed_at or datetime.utcnow()) - test.started_at
            ).total_seconds() / 3600 if test.started_at else 0,
            "statistical_significance": test.statistical_significance,
        },
        "variants": variant_results,
        "timeline": timeline_data,
    }


# ==================== Statistics ====================

@router.get("/stats")
async def get_ab_test_stats(
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Get overall A/B testing statistics."""
    user_id = UUID(current_user.sub)

    # Count by status
    total_tests = session.exec(
        select(func.count()).where(ABTest.owner_id == user_id)
    ).one()

    running_tests = session.exec(
        select(func.count()).where(
            ABTest.owner_id == user_id,
            ABTest.status == TestStatus.RUNNING,
        )
    ).one()

    completed_tests = session.exec(
        select(func.count()).where(
            ABTest.owner_id == user_id,
            ABTest.status == TestStatus.COMPLETED,
        )
    ).one()

    draft_tests = session.exec(
        select(func.count()).where(
            ABTest.owner_id == user_id,
            ABTest.status == TestStatus.DRAFT,
        )
    ).one()

    # Recent completed tests
    recent_tests = session.exec(
        select(ABTest)
        .where(
            ABTest.owner_id == user_id,
            ABTest.status == TestStatus.COMPLETED,
        )
        .order_by(ABTest.completed_at.desc())
        .limit(5)
    ).all()

    # Calculate average improvement from tests
    improvements = []
    for test in recent_tests:
        if test.winning_variant_id:
            variants = session.exec(
                select(TestVariant).where(TestVariant.test_id == test.id)
            ).all()
            control = next((v for v in variants if v.is_control), None)
            winner = next((v for v in variants if v.id == test.winning_variant_id), None)

            if control and winner and control.engagement_rate and winner.engagement_rate:
                improvement = (
                    (winner.engagement_rate - control.engagement_rate)
                    / control.engagement_rate * 100
                )
                improvements.append(improvement)

    avg_improvement = sum(improvements) / len(improvements) if improvements else 0

    return {
        "total_tests": total_tests,
        "running_tests": running_tests,
        "completed_tests": completed_tests,
        "draft_tests": draft_tests,
        "avg_improvement": round(avg_improvement, 2),
        "recent_tests": [
            {
                "id": str(t.id),
                "name": t.name,
                "platform": t.platform,
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                "has_winner": t.winning_variant_id is not None,
            }
            for t in recent_tests
        ],
    }
