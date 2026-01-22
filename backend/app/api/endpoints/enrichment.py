"""
Company Enrichment API Endpoint.

Provides AI-powered company data enrichment using web search and LLM extraction.
"""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.api.deps import CurrentUserDep, SessionDep
from app.models.company import Company
from app.services.enrichment_service import enrichment_service
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


class EnrichmentFieldResponse(BaseModel):
    """A single enriched field with metadata."""
    field_name: str
    current_value: Optional[str]
    suggested_value: Optional[str]
    confidence: float
    source_url: Optional[str] = None


class EnrichmentResponse(BaseModel):
    """Response from company enrichment."""
    success: bool
    company_id: str
    company_name: str
    fields: list[EnrichmentFieldResponse]
    sources_searched: int
    error: Optional[str] = None
    logs: list[str] = []  # Verbose logs for debugging


@router.post("/{company_id}/enrich", response_model=EnrichmentResponse)
async def enrich_company(
    company_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> EnrichmentResponse:
    """
    Enrich company data using AI-powered web search.

    Searches DuckDuckGo for company information, fetches web content,
    and uses LLM to extract structured company data with confidence scores.

    Returns preview data for user approval before applying.
    """
    # Fetch company from database
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    logger.info(f"User {current_user.sub} requested enrichment for company: {company.name}")

    # Build current data dict from company
    current_data = {
        "industry": company.industry,
        "size": company.size,
        "description": company.description,
        "website": company.website,
        "phone": company.phone,
        "address": company.address,
        "city": company.city,
        "state": company.state,
        "country": company.country,
        "postal_code": company.postal_code,
    }

    # Run enrichment
    result = await enrichment_service.enrich_company(
        company_name=company.name,
        current_data=current_data,
        max_search_results=5
    )

    # Convert to response model
    fields = [
        EnrichmentFieldResponse(
            field_name=f.field_name,
            current_value=f.current_value,
            suggested_value=f.suggested_value,
            confidence=f.confidence,
            source_url=f.source_url,
        )
        for f in result.fields
    ]

    return EnrichmentResponse(
        success=result.success,
        company_id=str(company_id),
        company_name=company.name,
        fields=fields,
        sources_searched=result.sources_searched,
        error=result.error,
        logs=result.logs,
    )
