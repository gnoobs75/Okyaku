"""API endpoints for Knowledge Base and RAG."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session

from app.api.deps import CurrentUserDep
from app.db.session import get_session
from app.core.config import settings
from app.models.knowledge_base import (
    DocumentType,
    DocumentStatus,
    KnowledgeDocumentResponse,
    RAGResponse,
    RAGSearchResult,
    CreateDocumentRequest,
    RAGQueryRequest,
)
from app.services.rag_service import rag_service

router = APIRouter()


@router.post("/documents", response_model=KnowledgeDocumentResponse)
async def create_document(
    request: CreateDocumentRequest,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> KnowledgeDocumentResponse:
    """
    Create a knowledge base document.

    The document will be chunked and embeddings generated for RAG retrieval.
    """
    if not settings.AI_RAG_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="RAG features are disabled. Enable AI_RAG_ENABLED in settings.",
        )

    return await rag_service.create_document(
        session=session,
        title=request.title,
        content=request.content,
        type=request.type,
        tags=request.tags,
        source_url=request.source_url,
    )


@router.get("/documents", response_model=list[KnowledgeDocumentResponse])
async def list_documents(
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
    type: Optional[DocumentType] = Query(default=None),
    status: Optional[DocumentStatus] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[KnowledgeDocumentResponse]:
    """List knowledge base documents."""
    return await rag_service.list_documents(
        session=session,
        type=type,
        status=status,
        limit=limit,
    )


@router.get("/documents/{document_id}", response_model=KnowledgeDocumentResponse)
async def get_document(
    document_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> KnowledgeDocumentResponse:
    """Get a specific knowledge document."""
    result = await rag_service.get_document(document_id, session)
    if not result:
        raise HTTPException(status_code=404, detail="Document not found")
    return result


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> dict:
    """Delete a knowledge document and its chunks."""
    success = await rag_service.delete_document(document_id, session)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"success": True, "message": "Document deleted"}


@router.post("/documents/{document_id}/reindex", response_model=KnowledgeDocumentResponse)
async def reindex_document(
    document_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> KnowledgeDocumentResponse:
    """Re-generate embeddings for a document."""
    if not settings.AI_RAG_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="RAG features are disabled.",
        )

    result = await rag_service.reindex_document(document_id, session)
    if not result:
        raise HTTPException(status_code=404, detail="Document not found")
    return result


@router.post("/search", response_model=list[RAGSearchResult])
async def search_knowledge_base(
    request: RAGQueryRequest,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> list[RAGSearchResult]:
    """
    Search the knowledge base using semantic similarity.

    Returns relevant document chunks ranked by similarity to the query.
    """
    if not settings.AI_RAG_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="RAG features are disabled.",
        )

    return await rag_service.search(
        query=request.query,
        session=session,
        top_k=request.top_k,
    )


@router.post("/query", response_model=RAGResponse)
async def query_knowledge_base(
    request: RAGQueryRequest,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> RAGResponse:
    """
    Query the knowledge base with RAG.

    Retrieves relevant document chunks and generates an answer using the LLM.
    """
    if not settings.AI_RAG_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="RAG features are disabled.",
        )

    return await rag_service.query(
        query=request.query,
        session=session,
        top_k=request.top_k,
        include_sources=request.include_sources,
    )


@router.get("/status")
async def get_rag_status(current_user: CurrentUserDep, session: Session = Depends(get_session)) -> dict:
    """Get status of RAG/knowledge base features."""
    from app.services.llm_service import llm_service
    from sqlmodel import func, select
    from app.models.knowledge_base import KnowledgeDocument, DocumentChunk

    health = await llm_service.check_health()
    is_available = health.get("status") == "healthy" and settings.AI_RAG_ENABLED

    # Get stats
    doc_count = session.exec(select(func.count(KnowledgeDocument.id))).one()
    chunk_count = session.exec(select(func.count(DocumentChunk.id))).one()
    embedded_chunks = session.exec(
        select(func.count(DocumentChunk.id)).where(DocumentChunk.embedding != None)
    ).one()

    return {
        "available": is_available,
        "enabled": settings.AI_RAG_ENABLED,
        "ollama_status": health.get("status"),
        "embedding_model": settings.OLLAMA_EMBEDDING_MODEL,
        "llm_model": settings.OLLAMA_MODEL,
        "stats": {
            "documents": doc_count,
            "chunks": chunk_count,
            "embedded_chunks": embedded_chunks,
        },
        "features": {
            "semantic_search": is_available,
            "rag_query": is_available,
            "document_management": True,
        },
    }
