"""
Company Enrichment Service - Web search + AI extraction for company data.

Uses DuckDuckGo for free web search and Ollama/Llama 3.1 for intelligent
extraction of company information from web sources.
"""

import asyncio
import re
from typing import Optional
from dataclasses import dataclass, field

import httpx
from ddgs import DDGS

from app.services.llm_service import llm_service
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class EnrichmentField:
    """A single enriched field with metadata."""
    field_name: str
    current_value: Optional[str]
    suggested_value: Optional[str]
    confidence: float  # 0.0 - 1.0
    source_url: Optional[str] = None


@dataclass
class EnrichmentResult:
    """Result of company enrichment attempt."""
    success: bool
    company_name: str
    fields: list[EnrichmentField] = field(default_factory=list)
    sources_searched: int = 0
    error: Optional[str] = None
    logs: list[str] = field(default_factory=list)  # Verbose logs for debugging


class CompanyEnrichmentService:
    """Service for enriching company data using web search and AI."""

    COMPANY_FIELDS = [
        "industry", "size", "description", "website",
        "phone", "address", "city", "state", "country", "postal_code"
    ]

    async def enrich_company(
        self,
        company_name: str,
        current_data: dict,
        max_search_results: int = 5
    ) -> EnrichmentResult:
        """
        Enrich company data by searching the web and extracting info with AI.

        Args:
            company_name: Name of the company to search for
            current_data: Current company field values
            max_search_results: Maximum number of search results to process

        Returns:
            EnrichmentResult with suggested field values
        """
        logs: list[str] = []

        def log(msg: str):
            # Ensure message can be safely encoded for Windows console (charmap)
            safe_msg = msg.encode('ascii', 'replace').decode('ascii')
            logs.append(safe_msg)
            logger.info(safe_msg)

        log(f"[START] Starting enrichment for company: {company_name}")

        try:
            # Step 1: Search DuckDuckGo
            log(f"[SEARCH] Searching DuckDuckGo for: '{company_name} company official website about'")
            search_results = await self._search_duckduckgo(
                company_name,
                max_results=max_search_results
            )

            if not search_results:
                log(f"[SEARCH] ERROR: No search results found")
                return EnrichmentResult(
                    success=False,
                    company_name=company_name,
                    fields=[],
                    sources_searched=0,
                    error="No search results found for this company",
                    logs=logs
                )

            log(f"[SEARCH] Found {len(search_results)} search results:")
            for i, r in enumerate(search_results[:5], 1):
                # Handle Unicode characters safely
                title = r.get('title', 'No title')[:60]
                title = title.encode('ascii', 'replace').decode('ascii')
                url = r.get('href', r.get('link', 'No URL'))
                url = url.encode('ascii', 'replace').decode('ascii')
                log(f"  {i}. {title}...")
                log(f"     URL: {url}")

            # Step 2: Fetch and extract content from top results
            log(f"[FETCH] Fetching web content from top {min(3, len(search_results))} results...")
            web_content = await self._fetch_web_content(search_results, logs=logs)

            if not web_content:
                log(f"[FETCH] ERROR: Could not fetch any web content")
                return EnrichmentResult(
                    success=False,
                    company_name=company_name,
                    fields=[],
                    sources_searched=len(search_results),
                    error="Could not fetch content from search results",
                    logs=logs
                )

            log(f"[FETCH] Successfully fetched content from {len(web_content)} sources")
            for c in web_content:
                safe_title = c['title'][:50].encode('ascii', 'replace').decode('ascii')
                log(f"  - {safe_title}... ({len(c['content'])} chars)")

            # Step 3: Use LLM to extract structured company data
            log(f"[LLM] Sending content to Ollama/Llama 3.1 for extraction...")
            log(f"[LLM] Total content size: {sum(len(c['content']) for c in web_content)} characters")
            extracted_data = await self._extract_with_llm(
                company_name,
                web_content,
                current_data,
                logs=logs
            )

            if extracted_data:
                log(f"[LLM] Extraction complete! Found data for {len([k for k,v in extracted_data.items() if v and k != 'confidence'])} fields")
            else:
                log(f"[LLM] Extraction returned no data")

            # Step 4: Build enrichment result
            log(f"[BUILD] Building enrichment fields...")
            fields = self._build_enrichment_fields(
                current_data,
                extracted_data,
                search_results
            )

            log(f"[DONE] Enrichment complete! {len(fields)} new/updated fields to suggest")

            return EnrichmentResult(
                success=True,
                company_name=company_name,
                fields=fields,
                sources_searched=len(search_results),
                logs=logs
            )

        except Exception as e:
            log(f"[ERROR] Enrichment failed: {str(e)}")
            logger.error(f"Enrichment error for {company_name}: {e}", exc_info=True)
            return EnrichmentResult(
                success=False,
                company_name=company_name,
                fields=[],
                sources_searched=0,
                error=str(e),
                logs=logs
            )

    async def _search_duckduckgo(
        self,
        company_name: str,
        max_results: int = 5
    ) -> list[dict]:
        """Search DuckDuckGo for company information."""

        def do_search():
            try:
                with DDGS() as ddgs:
                    # Search for company info
                    results = list(ddgs.text(
                        f"{company_name} company official website about",
                        max_results=max_results
                    ))
                    return results
            except Exception as e:
                logger.error(f"DuckDuckGo search error: {e}")
                return []

        # Run sync DuckDuckGo search in thread pool
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, do_search)

    async def _fetch_web_content(
        self,
        search_results: list[dict],
        timeout: float = 10.0,
        logs: list[str] = None
    ) -> list[dict]:
        """Fetch and extract text content from search result URLs."""
        content_list = []
        if logs is None:
            logs = []

        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        ) as client:
            for i, result in enumerate(search_results[:3], 1):  # Limit to top 3 for speed
                try:
                    url = result.get("href") or result.get("link")
                    if not url:
                        logs.append(f"[FETCH] Skipping result {i}: No URL")
                        continue

                    logs.append(f"[FETCH] Fetching ({i}/3): {url[:60]}...")
                    response = await client.get(url)
                    if response.status_code == 200:
                        text = self._extract_text_from_html(response.text)
                        content_list.append({
                            "url": url,
                            "title": result.get("title", ""),
                            "snippet": result.get("body", ""),
                            "content": text[:5000]  # Limit content size
                        })
                        logs.append(f"[FETCH] Success! Extracted {len(text[:5000])} chars from {url[:40]}...")
                    else:
                        logs.append(f"[FETCH] Failed ({response.status_code}): {url[:40]}...")
                except Exception as e:
                    logs.append(f"[FETCH] Error fetching {url[:40] if url else 'unknown'}: {str(e)[:50]}")
                    continue

        return content_list

    def _extract_text_from_html(self, html: str) -> str:
        """Basic HTML to text extraction."""
        # Remove script and style elements
        text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
        # Remove HTML comments
        text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', ' ', text)
        # Decode HTML entities
        text = re.sub(r'&nbsp;', ' ', text)
        text = re.sub(r'&amp;', '&', text)
        text = re.sub(r'&lt;', '<', text)
        text = re.sub(r'&gt;', '>', text)
        text = re.sub(r'&quot;', '"', text)
        # Clean whitespace
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    async def _extract_with_llm(
        self,
        company_name: str,
        web_content: list[dict],
        current_data: dict,
        logs: list[str] = None
    ) -> dict:
        """Use LLM to extract structured company data from web content."""

        # Prepare content summary for LLM
        content_text = "\n\n---\n\n".join([
            f"Source: {c['url']}\nTitle: {c['title']}\nContent: {c['content'][:2000]}"
            for c in web_content
        ])

        schema = {
            "type": "object",
            "properties": {
                "industry": {
                    "type": "string",
                    "description": "Company industry or sector (e.g., Technology, Healthcare, Automotive)"
                },
                "size": {
                    "type": "string",
                    "enum": ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"],
                    "description": "Employee count range"
                },
                "description": {
                    "type": "string",
                    "description": "Brief company description (2-3 sentences)"
                },
                "website": {
                    "type": "string",
                    "description": "Official company website URL"
                },
                "phone": {
                    "type": "string",
                    "description": "Main phone number"
                },
                "address": {
                    "type": "string",
                    "description": "Street address of headquarters"
                },
                "city": {
                    "type": "string",
                    "description": "City of headquarters"
                },
                "state": {
                    "type": "string",
                    "description": "State or province of headquarters"
                },
                "country": {
                    "type": "string",
                    "description": "Country of headquarters"
                },
                "postal_code": {
                    "type": "string",
                    "description": "Postal/ZIP code"
                },
                "confidence": {
                    "type": "object",
                    "description": "Confidence scores (0.0-1.0) for each extracted field",
                    "properties": {
                        "industry": {"type": "number"},
                        "size": {"type": "number"},
                        "description": {"type": "number"},
                        "website": {"type": "number"},
                        "phone": {"type": "number"},
                        "address": {"type": "number"},
                        "city": {"type": "number"},
                        "state": {"type": "number"},
                        "country": {"type": "number"},
                        "postal_code": {"type": "number"}
                    }
                }
            }
        }

        system_prompt = """You are a data extraction specialist. Your task is to extract company information from web content.

IMPORTANT RULES:
1. Only extract information that you find DIRECTLY in the provided content
2. Do NOT make up, guess, or infer values that are not explicitly stated
3. For each field, provide a confidence score from 0.0 to 1.0 based on how certain you are
4. If you cannot find reliable information for a field, set it to null
5. For the description, write a professional 2-3 sentence summary based on what you find
6. For website, only include the main company domain (e.g., "https://example.com")
7. For size, estimate based on any employee count or company size mentions"""

        user_prompt = f"""Extract company information for "{company_name}" from the following web content:

{content_text}

Extract these fields (set to null if not found with confidence):
- industry: What industry/sector is this company in?
- size: Employee count range (must be one of: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5001+)
- description: A brief 2-3 sentence description of what the company does
- website: The official company website URL
- phone: Main contact phone number
- address: Street address of headquarters
- city: City of headquarters
- state: State/province of headquarters
- country: Country of headquarters
- postal_code: Postal/ZIP code

Also provide a "confidence" object with scores (0.0-1.0) for each field you extracted.
Higher confidence (0.8+) means you found the exact information clearly stated.
Medium confidence (0.5-0.8) means you found related information but had to interpret slightly.
Low confidence (<0.5) means the information was unclear or inferred."""

        if logs is None:
            logs = []

        logs.append(f"[LLM] Calling Ollama API with {len(user_prompt)} char prompt...")
        import time
        start_time = time.time()

        result = await llm_service.generate_json(
            messages=[{"role": "user", "content": user_prompt}],
            schema=schema,
            system_prompt=system_prompt
        )

        elapsed = time.time() - start_time
        logs.append(f"[LLM] Response received in {elapsed:.1f} seconds")

        if result.get("success") and result.get("parsed"):
            parsed = result["parsed"]
            logs.append(f"[LLM] Successfully parsed JSON response")
            for key, value in parsed.items():
                if key != "confidence" and value:
                    logs.append(f"[LLM]   {key}: {str(value)[:50]}...")
            return parsed

        error_msg = result.get('error', 'Unknown error')
        logs.append(f"[LLM] Extraction failed: {error_msg}")
        logger.warning(f"LLM extraction failed: {error_msg}")
        return {}

    def _build_enrichment_fields(
        self,
        current_data: dict,
        extracted_data: dict,
        search_results: list[dict]
    ) -> list[EnrichmentField]:
        """Build list of enrichment fields with current vs suggested values."""
        fields = []
        confidence_scores = extracted_data.get("confidence", {})

        # Get primary source URL
        primary_source = None
        if search_results:
            primary_source = search_results[0].get("href") or search_results[0].get("link")

        for field_name in self.COMPANY_FIELDS:
            current_value = current_data.get(field_name)
            suggested_value = extracted_data.get(field_name)

            # Get confidence, default to 0.5 if not provided
            confidence = confidence_scores.get(field_name, 0.5) if confidence_scores else 0.5

            # Ensure confidence is a float
            if isinstance(confidence, (int, float)):
                confidence = float(confidence)
            else:
                confidence = 0.5

            # Only include if we have a suggested value that's different from current
            if suggested_value and suggested_value != current_value:
                fields.append(EnrichmentField(
                    field_name=field_name,
                    current_value=current_value,
                    suggested_value=str(suggested_value),
                    confidence=min(max(confidence, 0.0), 1.0),  # Clamp to 0-1
                    source_url=primary_source
                ))

        return fields


# Global service instance
enrichment_service = CompanyEnrichmentService()
