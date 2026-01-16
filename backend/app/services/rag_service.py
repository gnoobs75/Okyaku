"""Service for RAG (Retrieval Augmented Generation) operations."""

import logging
import time
from datetime import datetime
from typing import Optional
from uuid import UUID

import numpy as np
from sqlmodel import Session, select

from app.core.config import settings
from app.models.knowledge_base import (
    KnowledgeDocument,
    DocumentChunk,
    RAGQuery,
    DocumentType,
    DocumentStatus,
    KnowledgeDocumentResponse,
    RAGSearchResult,
    RAGResponse,
)
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)

# Chunk size for splitting documents (in characters)
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200


class RAGService:
    """Service for knowledge base and RAG operations."""

    async def create_document(
        self,
        session: Session,
        title: str,
        content: str,
        type: DocumentType = DocumentType.OTHER,
        tags: list[str] = [],
        source_url: Optional[str] = None,
    ) -> KnowledgeDocumentResponse:
        """
        Create a knowledge document and generate embeddings for chunks.
        """
        # Create document
        doc = KnowledgeDocument(
            title=title,
            type=type,
            content=content,
            tags=tags,
            source_url=source_url,
            source_type="manual",
            embedding_model=settings.OLLAMA_EMBEDDING_MODEL,
        )
        session.add(doc)
        session.commit()
        session.refresh(doc)

        # Split into chunks and generate embeddings
        chunks = self._split_into_chunks(content)
        chunk_count = 0

        for i, chunk_content in enumerate(chunks):
            try:
                # Generate embedding
                embedding = await llm_service.generate_embedding(chunk_content)

                chunk = DocumentChunk(
                    document_id=doc.id,
                    content=chunk_content,
                    chunk_index=i,
                    embedding=embedding,
                    embedding_model=settings.OLLAMA_EMBEDDING_MODEL,
                    token_count=len(chunk_content.split()),
                )
                session.add(chunk)
                chunk_count += 1
            except Exception as e:
                logger.error(f"Failed to create embedding for chunk {i}: {e}")
                # Still save chunk without embedding
                chunk = DocumentChunk(
                    document_id=doc.id,
                    content=chunk_content,
                    chunk_index=i,
                    token_count=len(chunk_content.split()),
                )
                session.add(chunk)
                chunk_count += 1

        # Generate summary
        try:
            summary_result = await llm_service.generate_json(
                prompt=f"Summarize this document in 2-3 sentences:\n\n{content[:2000]}",
                system_message="Generate a brief summary.",
            )
            if summary_result and "summary" in summary_result:
                doc.summary = summary_result["summary"]
        except Exception as e:
            logger.warning(f"Failed to generate summary: {e}")

        doc.chunk_count = chunk_count
        session.add(doc)
        session.commit()
        session.refresh(doc)

        return self._to_document_response(doc)

    async def search(
        self,
        query: str,
        session: Session,
        top_k: int = 5,
    ) -> list[RAGSearchResult]:
        """
        Search for relevant document chunks using vector similarity.

        Note: This implementation uses cosine similarity computed in Python.
        For production, use pgvector's built-in similarity operators for efficiency.
        """
        start_time = time.time()

        # Generate query embedding
        query_embedding = await llm_service.generate_embedding(query)
        if not query_embedding:
            logger.error("Failed to generate query embedding")
            return []

        # Get all chunks with embeddings
        chunks = session.exec(
            select(DocumentChunk, KnowledgeDocument)
            .join(KnowledgeDocument)
            .where(DocumentChunk.embedding != None)
            .where(KnowledgeDocument.status == DocumentStatus.ACTIVE)
        ).all()

        if not chunks:
            return []

        # Calculate similarities
        results = []
        query_vec = np.array(query_embedding)

        for chunk, doc in chunks:
            if chunk.embedding:
                chunk_vec = np.array(chunk.embedding)
                # Cosine similarity
                similarity = np.dot(query_vec, chunk_vec) / (
                    np.linalg.norm(query_vec) * np.linalg.norm(chunk_vec)
                )
                results.append({
                    "chunk": chunk,
                    "document": doc,
                    "similarity": float(similarity),
                })

        # Sort by similarity and take top_k
        results.sort(key=lambda x: x["similarity"], reverse=True)
        top_results = results[:top_k]

        retrieval_time = (time.time() - start_time) * 1000

        # Log query
        rag_query = RAGQuery(
            query=query,
            query_embedding=query_embedding,
            chunks_retrieved=len(top_results),
            documents_used=[str(r["document"].id) for r in top_results],
            retrieval_time_ms=retrieval_time,
        )
        session.add(rag_query)
        session.commit()

        return [
            RAGSearchResult(
                chunk_id=r["chunk"].id,
                document_id=r["document"].id,
                document_title=r["document"].title,
                content=r["chunk"].content,
                similarity_score=r["similarity"],
            )
            for r in top_results
        ]

    async def query(
        self,
        query: str,
        session: Session,
        top_k: int = 5,
        include_sources: bool = True,
    ) -> RAGResponse:
        """
        Perform RAG query: retrieve relevant chunks and generate answer.
        """
        start_time = time.time()

        # Retrieve relevant chunks
        search_results = await self.search(query, session, top_k)

        if not search_results:
            return RAGResponse(
                query=query,
                answer="I couldn't find any relevant information in the knowledge base.",
                sources=[],
                confidence=0.0,
            )

        # Build context from retrieved chunks
        context_parts = []
        for i, result in enumerate(search_results):
            context_parts.append(f"[Source {i+1}: {result.document_title}]\n{result.content}")

        context = "\n\n".join(context_parts)

        # Generate answer
        prompt = f"""Answer the following question based on the provided context.
If the context doesn't contain relevant information, say so.

Context:
{context}

Question: {query}

Provide a clear, helpful answer based on the context above."""

        gen_start = time.time()
        try:
            answer = await llm_service.chat(
                messages=[{"role": "user", "content": prompt}],
                system_message="You are a helpful assistant that answers questions based on provided context. Be accurate and cite sources when relevant.",
            )
        except Exception as e:
            logger.error(f"Failed to generate RAG answer: {e}")
            answer = "I found relevant information but couldn't generate a response."

        generation_time = (time.time() - gen_start) * 1000

        # Calculate confidence based on similarity scores
        avg_similarity = sum(r.similarity_score for r in search_results) / len(search_results)
        confidence = min(avg_similarity * 1.2, 1.0)  # Scale up but cap at 1.0

        # Update RAG query log
        rag_query = session.exec(
            select(RAGQuery).order_by(RAGQuery.created_at.desc()).limit(1)
        ).first()
        if rag_query:
            rag_query.response = answer
            rag_query.generation_time_ms = generation_time
            session.add(rag_query)
            session.commit()

        return RAGResponse(
            query=query,
            answer=answer or "Unable to generate answer.",
            sources=search_results if include_sources else [],
            confidence=confidence,
        )

    async def get_document(
        self,
        document_id: UUID,
        session: Session,
    ) -> Optional[KnowledgeDocumentResponse]:
        """Get a knowledge document by ID."""
        doc = session.get(KnowledgeDocument, document_id)
        if not doc:
            return None
        return self._to_document_response(doc)

    async def list_documents(
        self,
        session: Session,
        type: Optional[DocumentType] = None,
        status: Optional[DocumentStatus] = None,
        limit: int = 20,
    ) -> list[KnowledgeDocumentResponse]:
        """List knowledge documents."""
        stmt = select(KnowledgeDocument)

        if type:
            stmt = stmt.where(KnowledgeDocument.type == type)
        if status:
            stmt = stmt.where(KnowledgeDocument.status == status)
        else:
            stmt = stmt.where(KnowledgeDocument.status == DocumentStatus.ACTIVE)

        stmt = stmt.order_by(KnowledgeDocument.created_at.desc()).limit(limit)
        docs = session.exec(stmt).all()

        return [self._to_document_response(d) for d in docs]

    async def delete_document(
        self,
        document_id: UUID,
        session: Session,
    ) -> bool:
        """Delete a document and its chunks."""
        doc = session.get(KnowledgeDocument, document_id)
        if not doc:
            return False

        # Delete chunks
        chunks = session.exec(
            select(DocumentChunk).where(DocumentChunk.document_id == document_id)
        ).all()
        for chunk in chunks:
            session.delete(chunk)

        # Delete document
        session.delete(doc)
        session.commit()

        return True

    async def reindex_document(
        self,
        document_id: UUID,
        session: Session,
    ) -> Optional[KnowledgeDocumentResponse]:
        """Re-generate embeddings for a document."""
        doc = session.get(KnowledgeDocument, document_id)
        if not doc:
            return None

        # Delete existing chunks
        chunks = session.exec(
            select(DocumentChunk).where(DocumentChunk.document_id == document_id)
        ).all()
        for chunk in chunks:
            session.delete(chunk)
        session.commit()

        # Re-chunk and embed
        new_chunks = self._split_into_chunks(doc.content)
        chunk_count = 0

        for i, chunk_content in enumerate(new_chunks):
            try:
                embedding = await llm_service.generate_embedding(chunk_content)
                chunk = DocumentChunk(
                    document_id=doc.id,
                    content=chunk_content,
                    chunk_index=i,
                    embedding=embedding,
                    embedding_model=settings.OLLAMA_EMBEDDING_MODEL,
                    token_count=len(chunk_content.split()),
                )
                session.add(chunk)
                chunk_count += 1
            except Exception as e:
                logger.error(f"Reindex embedding failed for chunk {i}: {e}")

        doc.chunk_count = chunk_count
        doc.embedding_model = settings.OLLAMA_EMBEDDING_MODEL
        doc.updated_at = datetime.utcnow()
        session.add(doc)
        session.commit()
        session.refresh(doc)

        return self._to_document_response(doc)

    def _split_into_chunks(self, text: str) -> list[str]:
        """Split text into overlapping chunks."""
        chunks = []
        start = 0

        while start < len(text):
            end = start + CHUNK_SIZE
            chunk = text[start:end]

            # Try to break at sentence boundary
            if end < len(text):
                last_period = chunk.rfind(". ")
                if last_period > CHUNK_SIZE // 2:
                    chunk = chunk[: last_period + 1]
                    end = start + last_period + 1

            chunks.append(chunk.strip())
            start = end - CHUNK_OVERLAP

        return chunks

    def _to_document_response(self, doc: KnowledgeDocument) -> KnowledgeDocumentResponse:
        """Convert model to response."""
        return KnowledgeDocumentResponse(
            id=doc.id,
            title=doc.title,
            type=doc.type,
            status=doc.status,
            tags=doc.tags,
            content=doc.content,
            summary=doc.summary,
            source_url=doc.source_url,
            chunk_count=doc.chunk_count,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
        )


# Singleton instance
rag_service = RAGService()
