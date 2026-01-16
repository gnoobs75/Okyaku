"""Models for Knowledge Base and RAG (Retrieval Augmented Generation)."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel as PydanticBaseModel
from sqlalchemy import Column, Text
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.types import Float
from sqlmodel import Field, SQLModel


class DocumentType(str, Enum):
    """Type of knowledge base document."""
    HELP_ARTICLE = "help_article"
    FAQ = "faq"
    PRODUCT_INFO = "product_info"
    PROCESS = "process"
    POLICY = "policy"
    TEMPLATE = "template"
    OTHER = "other"


class DocumentStatus(str, Enum):
    """Status of a document."""
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class KnowledgeDocument(SQLModel, table=True):
    """Knowledge base document for RAG."""

    __tablename__ = "knowledge_documents"

    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Document metadata
    title: str = Field(max_length=500)
    type: DocumentType = Field(default=DocumentType.OTHER)
    status: DocumentStatus = Field(default=DocumentStatus.ACTIVE, index=True)
    tags: list = Field(default_factory=list, sa_column=Column(JSONB))

    # Content
    content: str = Field(sa_column=Column(Text))  # Full document content
    summary: Optional[str] = None  # AI-generated summary

    # Source tracking
    source_url: Optional[str] = None
    source_type: Optional[str] = None  # "manual", "import", "scrape"

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    # Embedding metadata (actual vectors stored in chunks)
    embedding_model: Optional[str] = None
    chunk_count: int = Field(default=0)


class DocumentChunk(SQLModel, table=True):
    """Chunked document content with embeddings for RAG retrieval."""

    __tablename__ = "document_chunks"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    document_id: UUID = Field(foreign_key="knowledge_documents.id", index=True)

    # Chunk content
    content: str = Field(sa_column=Column(Text))
    chunk_index: int = Field(default=0)  # Order within document

    # Embedding - stored as array of floats
    # Note: In production with pgvector, this would be a vector type
    # For now, we store as JSONB array which works without pgvector
    embedding: Optional[list] = Field(default=None, sa_column=Column(JSONB))
    embedding_model: Optional[str] = None

    # Metadata
    token_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RAGQuery(SQLModel, table=True):
    """Log of RAG queries for analytics."""

    __tablename__ = "rag_queries"

    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Query details
    query: str
    query_embedding: Optional[list] = Field(default=None, sa_column=Column(JSONB))

    # Results
    chunks_retrieved: int = Field(default=0)
    documents_used: list = Field(default_factory=list, sa_column=Column(JSONB))
    response: Optional[str] = None

    # Performance
    retrieval_time_ms: Optional[float] = None
    generation_time_ms: Optional[float] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Response models
class KnowledgeDocumentResponse(PydanticBaseModel):
    """API response for a knowledge document."""
    id: UUID
    title: str
    type: DocumentType
    status: DocumentStatus
    tags: list
    content: str
    summary: Optional[str]
    source_url: Optional[str]
    chunk_count: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class DocumentChunkResponse(PydanticBaseModel):
    """API response for a document chunk."""
    id: UUID
    document_id: UUID
    content: str
    chunk_index: int
    token_count: int

    class Config:
        from_attributes = True


class RAGSearchResult(PydanticBaseModel):
    """A single RAG search result."""
    chunk_id: UUID
    document_id: UUID
    document_title: str
    content: str
    similarity_score: float


class RAGResponse(PydanticBaseModel):
    """Response from RAG query."""
    query: str
    answer: str
    sources: list[RAGSearchResult]
    confidence: float


class CreateDocumentRequest(PydanticBaseModel):
    """Request to create a knowledge document."""
    title: str
    type: DocumentType = DocumentType.OTHER
    content: str
    tags: list[str] = []
    source_url: Optional[str] = None


class RAGQueryRequest(PydanticBaseModel):
    """Request for RAG query."""
    query: str
    top_k: int = 5
    include_sources: bool = True
