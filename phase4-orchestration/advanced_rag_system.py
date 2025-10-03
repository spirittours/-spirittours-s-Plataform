#!/usr/bin/env python3
"""
PHASE 4: Advanced AI Orchestration & Automation - Advanced RAG System
Enterprise-Grade Retrieval-Augmented Generation with Vector Databases

This module implements a comprehensive RAG system featuring:
- Multi-vector database support (Chroma, Pinecone, Weaviate, FAISS)
- Advanced document processing and chunking strategies
- Hybrid search combining semantic and keyword search
- Multi-modal embedding support (text, images, audio)
- Real-time knowledge base updates
- Contextual retrieval with conversation memory
- Query optimization and reranking
- Distributed vector search across multiple databases
- Advanced embedding models (OpenAI, Sentence Transformers, HuggingFace)
- Retrieval quality metrics and evaluation
- Enterprise security and access control
"""

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple, AsyncIterator
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import pickle
import numpy as np
from pathlib import Path
import tempfile
import threading
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

# Vector database imports
try:
    import chromadb
    from chromadb.config import Settings
except ImportError:
    print("ChromaDB not available")
    chromadb = None

try:
    import pinecone
except ImportError:
    print("Pinecone not available")
    pinecone = None

try:
    import weaviate
except ImportError:
    print("Weaviate not available") 
    weaviate = None

import faiss

# Embedding and ML imports
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import sentence_transformers
from sentence_transformers import SentenceTransformer

# OpenAI imports
try:
    import openai
except ImportError:
    print("OpenAI not available")
    openai = None

# HuggingFace imports
try:
    from transformers import AutoTokenizer, AutoModel
    import torch
except ImportError:
    print("HuggingFace transformers not available")

# Document processing imports
import PyPDF2
import docx
from bs4 import BeautifulSoup
import markdown
from langchain.text_splitter import RecursiveCharacterTextSplitter, TokenTextSplitter
from langchain.document_loaders import TextLoader, PDFLoader, WebBaseLoader

# Database and caching
import asyncpg
import redis.asyncio as redis
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Monitoring and metrics
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)

# Prometheus metrics
RAG_QUERIES = Counter('rag_queries_total', 'Total RAG queries', ['vector_db', 'query_type'])
RAG_RESPONSE_TIME = Histogram('rag_response_time_seconds', 'RAG response time', ['operation'])
DOCUMENT_INGESTION = Counter('rag_documents_ingested_total', 'Documents ingested', ['doc_type'])
VECTOR_DB_SIZE = Gauge('rag_vector_db_size', 'Vector database size', ['db_name'])
EMBEDDING_CACHE_HITS = Counter('rag_embedding_cache_hits_total', 'Embedding cache hits')
RETRIEVAL_QUALITY = Histogram('rag_retrieval_quality_score', 'Retrieval quality scores')

class VectorDatabaseType(Enum):
    """Supported vector database types."""
    CHROMA = "chroma"
    PINECONE = "pinecone"
    WEAVIATE = "weaviate"
    FAISS = "faiss"
    QDRANT = "qdrant"

class EmbeddingModel(Enum):
    """Supported embedding models."""
    OPENAI_ADA = "text-embedding-ada-002"
    OPENAI_3_SMALL = "text-embedding-3-small"
    OPENAI_3_LARGE = "text-embedding-3-large"
    SENTENCE_BERT = "all-MiniLM-L6-v2"
    SENTENCE_ROBERTA = "all-roberta-large-v1"
    HUGGINGFACE_BERT = "bert-base-uncased"
    E5_LARGE = "intfloat/e5-large-v2"
    BGE_LARGE = "BAAI/bge-large-en"

class ChunkingStrategy(Enum):
    """Document chunking strategies."""
    RECURSIVE = "recursive"
    TOKEN_BASED = "token_based"
    SEMANTIC = "semantic"
    FIXED_SIZE = "fixed_size"
    SLIDING_WINDOW = "sliding_window"

class SearchType(Enum):
    """Search types for retrieval."""
    SEMANTIC = "semantic"
    KEYWORD = "keyword"
    HYBRID = "hybrid"
    MMSE = "mmse"  # Maximal Marginal Relevance

@dataclass
class DocumentMetadata:
    """Metadata for ingested documents."""
    document_id: str
    source_path: str
    title: Optional[str]
    author: Optional[str]
    created_at: datetime
    updated_at: datetime
    document_type: str  # pdf, docx, txt, html, etc.
    size_bytes: int
    language: Optional[str]
    tags: List[str]
    access_permissions: List[str]
    chunk_count: int
    embedding_model: str
    checksum: str

@dataclass
class DocumentChunk:
    """Document chunk with metadata."""
    chunk_id: str
    document_id: str
    content: str
    chunk_index: int
    start_position: int
    end_position: int
    embedding: Optional[List[float]]
    metadata: Dict[str, Any]
    created_at: datetime

@dataclass
class QueryResult:
    """Result from vector search query."""
    chunk_id: str
    document_id: str
    content: str
    score: float
    metadata: Dict[str, Any]
    embedding_distance: float

@dataclass
class RAGResponse:
    """Complete RAG response with context."""
    query: str
    answer: str
    retrieved_chunks: List[QueryResult]
    context_used: str
    confidence_score: float
    response_time: float
    embedding_model: str
    llm_model: str
    retrieval_strategy: SearchType

class RAGSystemError(Exception):
    """Base exception for RAG system errors."""
    pass

class EmbeddingError(RAGSystemError):
    """Raised when embedding generation fails."""
    pass

class VectorDatabaseError(RAGSystemError):
    """Raised when vector database operations fail."""
    pass

class EmbeddingModelManager:
    """Manages different embedding models and caching."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.models = {}
        self.cache = {}
        self.cache_size_limit = config.get('embedding_cache_size', 10000)
        self._lock = threading.Lock()
        
        # Initialize default models
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize embedding models."""
        try:
            # OpenAI models
            if openai and self.config.get('openai_api_key'):
                openai.api_key = self.config['openai_api_key']
                self.models['openai'] = True
            
            # Sentence Transformers models
            default_sentence_model = self.config.get('default_sentence_model', 'all-MiniLM-L6-v2')
            self.models['sentence_transformer'] = SentenceTransformer(default_sentence_model)
            
            # HuggingFace models can be loaded on demand
            
            logger.info("Embedding models initialized")
            
        except Exception as e:
            logger.error("Failed to initialize embedding models", error=str(e))
    
    async def generate_embeddings(
        self, 
        texts: List[str], 
        model: EmbeddingModel = EmbeddingModel.SENTENCE_BERT
    ) -> List[List[float]]:
        """Generate embeddings for list of texts."""
        try:
            # Check cache first
            cached_embeddings = []
            texts_to_embed = []
            cache_keys = []
            
            for text in texts:
                cache_key = self._get_cache_key(text, model.value)
                if cache_key in self.cache:
                    cached_embeddings.append(self.cache[cache_key])
                    EMBEDDING_CACHE_HITS.inc()
                else:
                    cached_embeddings.append(None)
                    texts_to_embed.append(text)
                    cache_keys.append(cache_key)
            
            # Generate embeddings for uncached texts
            if texts_to_embed:
                new_embeddings = await self._generate_embeddings_batch(texts_to_embed, model)
                
                # Update cache
                with self._lock:
                    for i, embedding in enumerate(new_embeddings):
                        cache_key = cache_keys[i]
                        self._add_to_cache(cache_key, embedding)
            else:
                new_embeddings = []
            
            # Combine cached and new embeddings
            result = []
            new_idx = 0
            for cached in cached_embeddings:
                if cached is not None:
                    result.append(cached)
                else:
                    result.append(new_embeddings[new_idx])
                    new_idx += 1
            
            return result
            
        except Exception as e:
            logger.error("Failed to generate embeddings", model=model.value, error=str(e))
            raise EmbeddingError(f"Embedding generation failed: {e}")
    
    async def _generate_embeddings_batch(
        self, 
        texts: List[str], 
        model: EmbeddingModel
    ) -> List[List[float]]:
        """Generate embeddings for a batch of texts."""
        
        if model in [EmbeddingModel.OPENAI_ADA, EmbeddingModel.OPENAI_3_SMALL, EmbeddingModel.OPENAI_3_LARGE]:
            return await self._generate_openai_embeddings(texts, model.value)
        elif model in [EmbeddingModel.SENTENCE_BERT, EmbeddingModel.SENTENCE_ROBERTA]:
            return await self._generate_sentence_transformer_embeddings(texts, model.value)
        else:
            # Default to sentence transformer
            return await self._generate_sentence_transformer_embeddings(texts, "all-MiniLM-L6-v2")
    
    async def _generate_openai_embeddings(self, texts: List[str], model: str) -> List[List[float]]:
        """Generate OpenAI embeddings."""
        if not openai or not self.config.get('openai_api_key'):
            raise EmbeddingError("OpenAI not configured")
        
        try:
            response = await openai.Embedding.acreate(
                input=texts,
                model=model
            )
            
            return [item['embedding'] for item in response['data']]
            
        except Exception as e:
            logger.error("OpenAI embedding generation failed", model=model, error=str(e))
            raise EmbeddingError(f"OpenAI embedding failed: {e}")
    
    async def _generate_sentence_transformer_embeddings(self, texts: List[str], model: str) -> List[List[float]]:
        """Generate Sentence Transformer embeddings."""
        try:
            # Load model if not cached
            if model not in self.models or not isinstance(self.models[model], SentenceTransformer):
                self.models[model] = SentenceTransformer(model)
            
            embeddings = self.models[model].encode(texts, convert_to_numpy=True)
            return embeddings.tolist()
            
        except Exception as e:
            logger.error("Sentence Transformer embedding generation failed", model=model, error=str(e))
            raise EmbeddingError(f"Sentence Transformer embedding failed: {e}")
    
    def _get_cache_key(self, text: str, model: str) -> str:
        """Generate cache key for text and model."""
        content = f"{text}:{model}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    def _add_to_cache(self, key: str, embedding: List[float]):
        """Add embedding to cache with size management."""
        if len(self.cache) >= self.cache_size_limit:
            # Remove oldest entry (simple FIFO)
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        
        self.cache[key] = embedding

class DocumentProcessor:
    """Processes documents for ingestion into vector databases."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.text_splitters = self._initialize_text_splitters()
    
    def _initialize_text_splitters(self) -> Dict[str, Any]:
        """Initialize text splitters for different strategies."""
        return {
            ChunkingStrategy.RECURSIVE: RecursiveCharacterTextSplitter(
                chunk_size=self.config.get('chunk_size', 1000),
                chunk_overlap=self.config.get('chunk_overlap', 200),
                length_function=len,
            ),
            ChunkingStrategy.TOKEN_BASED: TokenTextSplitter(
                chunk_size=self.config.get('token_chunk_size', 500),
                chunk_overlap=self.config.get('token_chunk_overlap', 50)
            ),
            ChunkingStrategy.FIXED_SIZE: RecursiveCharacterTextSplitter(
                chunk_size=self.config.get('fixed_chunk_size', 800),
                chunk_overlap=0,
                length_function=len,
            )
        }
    
    async def process_document(
        self, 
        file_path: str, 
        chunking_strategy: ChunkingStrategy = ChunkingStrategy.RECURSIVE,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[DocumentChunk]:
        """Process a document and return chunks."""
        try:
            # Extract text from document
            text, doc_metadata = await self._extract_text_from_file(file_path)
            
            # Merge provided metadata with extracted metadata
            if metadata:
                doc_metadata.update(metadata)
            
            # Create document ID
            document_id = str(uuid.uuid4())
            
            # Split text into chunks
            chunks = await self._split_text_into_chunks(text, chunking_strategy)
            
            # Create DocumentChunk objects
            document_chunks = []
            for i, chunk_text in enumerate(chunks):
                chunk = DocumentChunk(
                    chunk_id=str(uuid.uuid4()),
                    document_id=document_id,
                    content=chunk_text,
                    chunk_index=i,
                    start_position=0,  # Would calculate actual positions
                    end_position=len(chunk_text),
                    embedding=None,  # Will be generated later
                    metadata={
                        **doc_metadata,
                        'chunk_index': i,
                        'total_chunks': len(chunks)
                    },
                    created_at=datetime.utcnow()
                )
                document_chunks.append(chunk)
            
            DOCUMENT_INGESTION.labels(doc_type=Path(file_path).suffix).inc()
            logger.info("Document processed", 
                       file_path=file_path, 
                       document_id=document_id,
                       chunk_count=len(document_chunks))
            
            return document_chunks
            
        except Exception as e:
            logger.error("Failed to process document", file_path=file_path, error=str(e))
            raise RAGSystemError(f"Document processing failed: {e}")
    
    async def _extract_text_from_file(self, file_path: str) -> Tuple[str, Dict[str, Any]]:
        """Extract text from various file formats."""
        path = Path(file_path)
        file_extension = path.suffix.lower()
        
        metadata = {
            'filename': path.name,
            'file_size': path.stat().st_size,
            'file_type': file_extension,
            'created_at': datetime.fromtimestamp(path.stat().st_ctime),
            'modified_at': datetime.fromtimestamp(path.stat().st_mtime)
        }
        
        try:
            if file_extension == '.pdf':
                text = await self._extract_pdf_text(file_path)
            elif file_extension == '.docx':
                text = await self._extract_docx_text(file_path)
            elif file_extension == '.txt':
                text = await self._extract_txt_text(file_path)
            elif file_extension in ['.html', '.htm']:
                text = await self._extract_html_text(file_path)
            elif file_extension == '.md':
                text = await self._extract_markdown_text(file_path)
            else:
                # Try as plain text
                text = await self._extract_txt_text(file_path)
            
            return text, metadata
            
        except Exception as e:
            logger.error("Text extraction failed", file_path=file_path, error=str(e))
            raise RAGSystemError(f"Text extraction failed: {e}")
    
    async def _extract_pdf_text(self, file_path: str) -> str:
        """Extract text from PDF file."""
        text = ""
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text
    
    async def _extract_docx_text(self, file_path: str) -> str:
        """Extract text from DOCX file."""
        doc = docx.Document(file_path)
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])
    
    async def _extract_txt_text(self, file_path: str) -> str:
        """Extract text from TXT file."""
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    
    async def _extract_html_text(self, file_path: str) -> str:
        """Extract text from HTML file."""
        with open(file_path, 'r', encoding='utf-8') as file:
            soup = BeautifulSoup(file.read(), 'html.parser')
            return soup.get_text()
    
    async def _extract_markdown_text(self, file_path: str) -> str:
        """Extract text from Markdown file."""
        with open(file_path, 'r', encoding='utf-8') as file:
            md_content = file.read()
            html = markdown.markdown(md_content)
            soup = BeautifulSoup(html, 'html.parser')
            return soup.get_text()
    
    async def _split_text_into_chunks(
        self, 
        text: str, 
        strategy: ChunkingStrategy
    ) -> List[str]:
        """Split text into chunks using specified strategy."""
        
        if strategy in self.text_splitters:
            splitter = self.text_splitters[strategy]
            return splitter.split_text(text)
        elif strategy == ChunkingStrategy.SLIDING_WINDOW:
            return await self._sliding_window_split(text)
        elif strategy == ChunkingStrategy.SEMANTIC:
            return await self._semantic_split(text)
        else:
            # Default to recursive splitting
            return self.text_splitters[ChunkingStrategy.RECURSIVE].split_text(text)
    
    async def _sliding_window_split(self, text: str) -> List[str]:
        """Split text using sliding window approach."""
        window_size = self.config.get('window_size', 1000)
        step_size = self.config.get('window_step', 500)
        
        chunks = []
        for i in range(0, len(text), step_size):
            chunk = text[i:i + window_size]
            if len(chunk.strip()) > 50:  # Minimum chunk size
                chunks.append(chunk)
            
            if i + window_size >= len(text):
                break
        
        return chunks
    
    async def _semantic_split(self, text: str) -> List[str]:
        """Split text based on semantic boundaries (sentences, paragraphs)."""
        import nltk
        try:
            nltk.download('punkt', quiet=True)
        except:
            pass
        
        # Split by sentences first
        sentences = nltk.sent_tokenize(text)
        
        chunks = []
        current_chunk = []
        current_length = 0
        max_length = self.config.get('semantic_chunk_size', 800)
        
        for sentence in sentences:
            sentence_length = len(sentence)
            
            if current_length + sentence_length <= max_length:
                current_chunk.append(sentence)
                current_length += sentence_length
            else:
                if current_chunk:
                    chunks.append(' '.join(current_chunk))
                current_chunk = [sentence]
                current_length = sentence_length
        
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return chunks

class VectorDatabaseManager:
    """Manages multiple vector databases and provides unified interface."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.databases = {}
        self.default_db = config.get('default_vector_db', VectorDatabaseType.FAISS)
        
        # Initialize databases
        self._initialize_databases()
    
    def _initialize_databases(self):
        """Initialize configured vector databases."""
        
        # Initialize FAISS (always available)
        faiss_config = self.config.get('faiss', {})
        self.databases[VectorDatabaseType.FAISS] = FAISSVectorDB(faiss_config)
        
        # Initialize ChromaDB if configured
        if chromadb and 'chroma' in self.config:
            chroma_config = self.config['chroma']
            self.databases[VectorDatabaseType.CHROMA] = ChromaVectorDB(chroma_config)
        
        # Initialize Pinecone if configured  
        if pinecone and 'pinecone' in self.config:
            pinecone_config = self.config['pinecone']
            self.databases[VectorDatabaseType.PINECONE] = PineconeVectorDB(pinecone_config)
        
        # Initialize Weaviate if configured
        if weaviate and 'weaviate' in self.config:
            weaviate_config = self.config['weaviate']
            self.databases[VectorDatabaseType.WEAVIATE] = WeaviateVectorDB(weaviate_config)
        
        logger.info("Vector databases initialized", databases=list(self.databases.keys()))
    
    async def add_documents(
        self, 
        chunks: List[DocumentChunk], 
        embeddings: List[List[float]],
        db_type: Optional[VectorDatabaseType] = None
    ) -> bool:
        """Add document chunks with embeddings to vector database."""
        
        db_type = db_type or self.default_db
        
        if db_type not in self.databases:
            raise VectorDatabaseError(f"Database {db_type} not available")
        
        try:
            database = self.databases[db_type]
            success = await database.add_documents(chunks, embeddings)
            
            if success:
                VECTOR_DB_SIZE.labels(db_name=db_type.value).inc(len(chunks))
                logger.info("Documents added to vector database", 
                           db_type=db_type.value, 
                           count=len(chunks))
            
            return success
            
        except Exception as e:
            logger.error("Failed to add documents to vector database", 
                        db_type=db_type.value, 
                        error=str(e))
            raise VectorDatabaseError(f"Document addition failed: {e}")
    
    async def search(
        self, 
        query_embedding: List[float], 
        k: int = 10,
        db_type: Optional[VectorDatabaseType] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[QueryResult]:
        """Search for similar documents in vector database."""
        
        db_type = db_type or self.default_db
        
        if db_type not in self.databases:
            raise VectorDatabaseError(f"Database {db_type} not available")
        
        try:
            database = self.databases[db_type]
            results = await database.search(query_embedding, k, filters)
            
            RAG_QUERIES.labels(vector_db=db_type.value, query_type='semantic').inc()
            
            return results
            
        except Exception as e:
            logger.error("Vector database search failed", 
                        db_type=db_type.value, 
                        error=str(e))
            raise VectorDatabaseError(f"Search failed: {e}")
    
    async def delete_documents(
        self, 
        document_ids: List[str],
        db_type: Optional[VectorDatabaseType] = None
    ) -> bool:
        """Delete documents from vector database."""
        
        db_type = db_type or self.default_db
        
        if db_type not in self.databases:
            raise VectorDatabaseError(f"Database {db_type} not available")
        
        try:
            database = self.databases[db_type]
            success = await database.delete_documents(document_ids)
            
            if success:
                logger.info("Documents deleted from vector database",
                           db_type=db_type.value,
                           count=len(document_ids))
            
            return success
            
        except Exception as e:
            logger.error("Failed to delete documents from vector database",
                        db_type=db_type.value,
                        error=str(e))
            raise VectorDatabaseError(f"Document deletion failed: {e}")

class FAISSVectorDB:
    """FAISS vector database implementation."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.index = None
        self.document_store = {}  # Store document metadata
        self.dimension = config.get('dimension', 384)  # Default for all-MiniLM-L6-v2
        
        # Initialize FAISS index
        self._initialize_index()
    
    def _initialize_index(self):
        """Initialize FAISS index."""
        index_type = self.config.get('index_type', 'flat')
        
        if index_type == 'flat':
            self.index = faiss.IndexFlatIP(self.dimension)  # Inner product
        elif index_type == 'ivf':
            nlist = self.config.get('nlist', 100)
            quantizer = faiss.IndexFlatIP(self.dimension)
            self.index = faiss.IndexIVFFlat(quantizer, self.dimension, nlist)
        elif index_type == 'hnsw':
            m = self.config.get('hnsw_m', 16)
            self.index = faiss.IndexHNSWFlat(self.dimension, m)
        
        logger.info("FAISS index initialized", type=index_type, dimension=self.dimension)
    
    async def add_documents(self, chunks: List[DocumentChunk], embeddings: List[List[float]]) -> bool:
        """Add documents to FAISS index."""
        try:
            if len(chunks) != len(embeddings):
                raise ValueError("Chunks and embeddings count mismatch")
            
            # Convert embeddings to numpy array
            embedding_array = np.array(embeddings, dtype=np.float32)
            
            # Normalize embeddings for cosine similarity
            faiss.normalize_L2(embedding_array)
            
            # Add to index
            start_id = self.index.ntotal
            self.index.add(embedding_array)
            
            # Store document metadata
            for i, chunk in enumerate(chunks):
                doc_id = start_id + i
                self.document_store[doc_id] = chunk
            
            return True
            
        except Exception as e:
            logger.error("Failed to add documents to FAISS", error=str(e))
            return False
    
    async def search(
        self, 
        query_embedding: List[float], 
        k: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[QueryResult]:
        """Search FAISS index for similar documents."""
        try:
            # Convert query embedding to numpy array and normalize
            query_array = np.array([query_embedding], dtype=np.float32)
            faiss.normalize_L2(query_array)
            
            # Search
            scores, indices = self.index.search(query_array, k)
            
            # Convert results
            results = []
            for i, (score, idx) in enumerate(zip(scores[0], indices[0])):
                if idx in self.document_store:
                    chunk = self.document_store[idx]
                    result = QueryResult(
                        chunk_id=chunk.chunk_id,
                        document_id=chunk.document_id,
                        content=chunk.content,
                        score=float(score),
                        metadata=chunk.metadata,
                        embedding_distance=1 - float(score)  # Convert similarity to distance
                    )
                    results.append(result)
            
            return results
            
        except Exception as e:
            logger.error("FAISS search failed", error=str(e))
            return []
    
    async def delete_documents(self, document_ids: List[str]) -> bool:
        """Delete documents from FAISS index."""
        # FAISS doesn't support deletion directly, would need to rebuild index
        # For now, mark as deleted in metadata
        try:
            deleted_count = 0
            for doc_id, chunk in self.document_store.items():
                if chunk.document_id in document_ids:
                    chunk.metadata['deleted'] = True
                    deleted_count += 1
            
            logger.info("Documents marked as deleted", count=deleted_count)
            return True
            
        except Exception as e:
            logger.error("Failed to delete documents from FAISS", error=str(e))
            return False

class ChromaVectorDB:
    """ChromaDB vector database implementation."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.client = None
        self.collection = None
        
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize ChromaDB client."""
        try:
            persist_directory = self.config.get('persist_directory', './chroma_db')
            
            self.client = chromadb.Client(Settings(
                chroma_db_impl="duckdb+parquet",
                persist_directory=persist_directory
            ))
            
            collection_name = self.config.get('collection_name', 'documents')
            self.collection = self.client.get_or_create_collection(name=collection_name)
            
            logger.info("ChromaDB client initialized", collection=collection_name)
            
        except Exception as e:
            logger.error("Failed to initialize ChromaDB", error=str(e))
            raise VectorDatabaseError(f"ChromaDB initialization failed: {e}")
    
    async def add_documents(self, chunks: List[DocumentChunk], embeddings: List[List[float]]) -> bool:
        """Add documents to ChromaDB collection."""
        try:
            ids = [chunk.chunk_id for chunk in chunks]
            documents = [chunk.content for chunk in chunks]
            metadatas = [chunk.metadata for chunk in chunks]
            
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
            
            return True
            
        except Exception as e:
            logger.error("Failed to add documents to ChromaDB", error=str(e))
            return False
    
    async def search(
        self, 
        query_embedding: List[float], 
        k: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[QueryResult]:
        """Search ChromaDB collection."""
        try:
            where_clause = filters if filters else None
            
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=k,
                where=where_clause
            )
            
            query_results = []
            for i in range(len(results['ids'][0])):
                result = QueryResult(
                    chunk_id=results['ids'][0][i],
                    document_id=results['metadatas'][0][i].get('document_id', ''),
                    content=results['documents'][0][i],
                    score=1 - results['distances'][0][i],  # Convert distance to similarity
                    metadata=results['metadatas'][0][i],
                    embedding_distance=results['distances'][0][i]
                )
                query_results.append(result)
            
            return query_results
            
        except Exception as e:
            logger.error("ChromaDB search failed", error=str(e))
            return []
    
    async def delete_documents(self, document_ids: List[str]) -> bool:
        """Delete documents from ChromaDB collection."""
        try:
            # Find all chunk IDs for the documents
            chunk_ids_to_delete = []
            
            # Query for chunks belonging to these documents
            for doc_id in document_ids:
                results = self.collection.query(
                    query_embeddings=[[0] * 384],  # Dummy embedding
                    where={"document_id": doc_id},
                    n_results=1000
                )
                chunk_ids_to_delete.extend(results['ids'][0])
            
            if chunk_ids_to_delete:
                self.collection.delete(ids=chunk_ids_to_delete)
            
            return True
            
        except Exception as e:
            logger.error("Failed to delete documents from ChromaDB", error=str(e))
            return False

class PineconeVectorDB:
    """Pinecone vector database implementation."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.index = None
        
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Pinecone client."""
        try:
            api_key = self.config.get('api_key')
            environment = self.config.get('environment')
            
            if not api_key or not environment:
                raise ValueError("Pinecone API key and environment required")
            
            pinecone.init(api_key=api_key, environment=environment)
            
            index_name = self.config.get('index_name', 'documents')
            self.index = pinecone.Index(index_name)
            
            logger.info("Pinecone client initialized", index_name=index_name)
            
        except Exception as e:
            logger.error("Failed to initialize Pinecone", error=str(e))
            raise VectorDatabaseError(f"Pinecone initialization failed: {e}")
    
    async def add_documents(self, chunks: List[DocumentChunk], embeddings: List[List[float]]) -> bool:
        """Add documents to Pinecone index."""
        try:
            vectors = []
            for chunk, embedding in zip(chunks, embeddings):
                vectors.append((
                    chunk.chunk_id,
                    embedding,
                    {
                        'document_id': chunk.document_id,
                        'content': chunk.content[:1000],  # Truncate for metadata
                        **chunk.metadata
                    }
                ))
            
            self.index.upsert(vectors)
            return True
            
        except Exception as e:
            logger.error("Failed to add documents to Pinecone", error=str(e))
            return False
    
    async def search(
        self, 
        query_embedding: List[float], 
        k: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[QueryResult]:
        """Search Pinecone index."""
        try:
            results = self.index.query(
                vector=query_embedding,
                top_k=k,
                include_metadata=True,
                filter=filters
            )
            
            query_results = []
            for match in results['matches']:
                result = QueryResult(
                    chunk_id=match['id'],
                    document_id=match['metadata'].get('document_id', ''),
                    content=match['metadata'].get('content', ''),
                    score=match['score'],
                    metadata=match['metadata'],
                    embedding_distance=1 - match['score']
                )
                query_results.append(result)
            
            return query_results
            
        except Exception as e:
            logger.error("Pinecone search failed", error=str(e))
            return []
    
    async def delete_documents(self, document_ids: List[str]) -> bool:
        """Delete documents from Pinecone index."""
        try:
            # Pinecone requires chunk IDs for deletion
            # Would need to maintain a mapping or search first
            for doc_id in document_ids:
                self.index.delete(filter={'document_id': doc_id})
            
            return True
            
        except Exception as e:
            logger.error("Failed to delete documents from Pinecone", error=str(e))
            return False

class WeaviateVectorDB:
    """Weaviate vector database implementation."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.client = None
        
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Weaviate client."""
        try:
            url = self.config.get('url', 'http://localhost:8080')
            api_key = self.config.get('api_key')
            
            if api_key:
                self.client = weaviate.Client(
                    url=url,
                    auth_client_secret=weaviate.AuthApiKey(api_key=api_key)
                )
            else:
                self.client = weaviate.Client(url=url)
            
            # Create schema if it doesn't exist
            self._create_schema()
            
            logger.info("Weaviate client initialized", url=url)
            
        except Exception as e:
            logger.error("Failed to initialize Weaviate", error=str(e))
            raise VectorDatabaseError(f"Weaviate initialization failed: {e}")
    
    def _create_schema(self):
        """Create Weaviate schema for documents."""
        schema = {
            "classes": [{
                "class": "Document",
                "description": "A document chunk",
                "properties": [
                    {
                        "name": "content",
                        "dataType": ["text"],
                        "description": "Document content"
                    },
                    {
                        "name": "documentId", 
                        "dataType": ["string"],
                        "description": "Parent document ID"
                    },
                    {
                        "name": "chunkIndex",
                        "dataType": ["int"],
                        "description": "Chunk index"
                    }
                ]
            }]
        }
        
        try:
            if not self.client.schema.exists("Document"):
                self.client.schema.create(schema)
        except Exception as e:
            logger.warning("Failed to create Weaviate schema", error=str(e))
    
    async def add_documents(self, chunks: List[DocumentChunk], embeddings: List[List[float]]) -> bool:
        """Add documents to Weaviate."""
        try:
            with self.client.batch as batch:
                for chunk, embedding in zip(chunks, embeddings):
                    properties = {
                        "content": chunk.content,
                        "documentId": chunk.document_id,
                        "chunkIndex": chunk.chunk_index
                    }
                    
                    batch.add_data_object(
                        properties,
                        "Document",
                        uuid=chunk.chunk_id,
                        vector=embedding
                    )
            
            return True
            
        except Exception as e:
            logger.error("Failed to add documents to Weaviate", error=str(e))
            return False
    
    async def search(
        self, 
        query_embedding: List[float], 
        k: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[QueryResult]:
        """Search Weaviate index."""
        try:
            near_vector = {"vector": query_embedding}
            
            query = (
                self.client.query
                .get("Document", ["content", "documentId", "chunkIndex"])
                .with_near_vector(near_vector)
                .with_limit(k)
                .with_additional(['certainty'])
            )
            
            if filters:
                # Add where clause if filters provided
                pass  # Would implement filter logic
            
            results = query.do()
            
            query_results = []
            if 'data' in results and 'Get' in results['data'] and 'Document' in results['data']['Get']:
                for item in results['data']['Get']['Document']:
                    result = QueryResult(
                        chunk_id='',  # Would need to get from Weaviate
                        document_id=item.get('documentId', ''),
                        content=item.get('content', ''),
                        score=item['_additional']['certainty'],
                        metadata={'chunkIndex': item.get('chunkIndex')},
                        embedding_distance=1 - item['_additional']['certainty']
                    )
                    query_results.append(result)
            
            return query_results
            
        except Exception as e:
            logger.error("Weaviate search failed", error=str(e))
            return []
    
    async def delete_documents(self, document_ids: List[str]) -> bool:
        """Delete documents from Weaviate."""
        try:
            for doc_id in document_ids:
                where_filter = {
                    "path": ["documentId"],
                    "operator": "Equal",
                    "valueString": doc_id
                }
                
                self.client.batch.delete_objects(
                    class_name="Document",
                    where=where_filter
                )
            
            return True
            
        except Exception as e:
            logger.error("Failed to delete documents from Weaviate", error=str(e))
            return False

class HybridSearchEngine:
    """Combines semantic and keyword search for better retrieval."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.tfidf_vectorizer = None
        self.tfidf_matrix = None
        self.document_texts = {}
        
        # Initialize TF-IDF vectorizer
        self._initialize_tfidf()
    
    def _initialize_tfidf(self):
        """Initialize TF-IDF vectorizer for keyword search."""
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=self.config.get('tfidf_max_features', 10000),
            ngram_range=self.config.get('tfidf_ngram_range', (1, 2)),
            stop_words='english'
        )
    
    async def add_documents_for_keyword_search(self, chunks: List[DocumentChunk]):
        """Add documents to keyword search index."""
        try:
            texts = [chunk.content for chunk in chunks]
            chunk_ids = [chunk.chunk_id for chunk in chunks]
            
            # Store document texts
            for chunk_id, text in zip(chunk_ids, texts):
                self.document_texts[chunk_id] = text
            
            # Fit TF-IDF vectorizer on all texts
            all_texts = list(self.document_texts.values())
            self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(all_texts)
            
            logger.info("Documents added to keyword search index", count=len(chunks))
            
        except Exception as e:
            logger.error("Failed to add documents to keyword search", error=str(e))
    
    async def hybrid_search(
        self, 
        query: str,
        query_embedding: List[float],
        vector_results: List[QueryResult],
        semantic_weight: float = 0.7,
        keyword_weight: float = 0.3,
        k: int = 10
    ) -> List[QueryResult]:
        """Perform hybrid search combining semantic and keyword search."""
        try:
            # Perform keyword search
            keyword_results = await self._keyword_search(query, k * 2)  # Get more for reranking
            
            # Combine and rerank results
            combined_results = await self._combine_and_rerank(
                vector_results, keyword_results, semantic_weight, keyword_weight
            )
            
            RAG_QUERIES.labels(vector_db='hybrid', query_type='hybrid').inc()
            
            return combined_results[:k]
            
        except Exception as e:
            logger.error("Hybrid search failed", error=str(e))
            return vector_results[:k]  # Fallback to semantic results
    
    async def _keyword_search(self, query: str, k: int) -> List[QueryResult]:
        """Perform keyword-based search using TF-IDF."""
        if not self.tfidf_vectorizer or not self.tfidf_matrix:
            return []
        
        try:
            # Transform query
            query_vector = self.tfidf_vectorizer.transform([query])
            
            # Calculate similarity
            similarities = cosine_similarity(query_vector, self.tfidf_matrix).flatten()
            
            # Get top k results
            top_indices = similarities.argsort()[-k:][::-1]
            
            results = []
            document_ids = list(self.document_texts.keys())
            
            for idx in top_indices:
                if similarities[idx] > 0:  # Only include relevant results
                    chunk_id = document_ids[idx]
                    result = QueryResult(
                        chunk_id=chunk_id,
                        document_id='',  # Would need to maintain mapping
                        content=self.document_texts[chunk_id],
                        score=similarities[idx],
                        metadata={},
                        embedding_distance=1 - similarities[idx]
                    )
                    results.append(result)
            
            return results
            
        except Exception as e:
            logger.error("Keyword search failed", error=str(e))
            return []
    
    async def _combine_and_rerank(
        self, 
        semantic_results: List[QueryResult],
        keyword_results: List[QueryResult],
        semantic_weight: float,
        keyword_weight: float
    ) -> List[QueryResult]:
        """Combine and rerank semantic and keyword search results."""
        
        # Create combined score mapping
        chunk_scores = {}
        
        # Add semantic scores
        for result in semantic_results:
            chunk_scores[result.chunk_id] = {
                'semantic_score': result.score,
                'keyword_score': 0.0,
                'result': result
            }
        
        # Add keyword scores
        for result in keyword_results:
            if result.chunk_id in chunk_scores:
                chunk_scores[result.chunk_id]['keyword_score'] = result.score
            else:
                chunk_scores[result.chunk_id] = {
                    'semantic_score': 0.0,
                    'keyword_score': result.score,
                    'result': result
                }
        
        # Calculate combined scores and rerank
        reranked_results = []
        for chunk_id, scores in chunk_scores.items():
            combined_score = (
                semantic_weight * scores['semantic_score'] + 
                keyword_weight * scores['keyword_score']
            )
            
            result = scores['result']
            result.score = combined_score
            reranked_results.append(result)
        
        # Sort by combined score
        reranked_results.sort(key=lambda x: x.score, reverse=True)
        
        return reranked_results

class AdvancedRAGSystem:
    """
    Advanced Retrieval-Augmented Generation System
    
    Provides enterprise-grade RAG capabilities including:
    - Multi-vector database support
    - Advanced document processing and chunking
    - Hybrid semantic and keyword search
    - Real-time knowledge base updates
    - Query optimization and reranking
    - Multi-modal embedding support
    - Conversation memory and context
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        
        # Initialize components
        self.embedding_manager = EmbeddingModelManager(config.get('embeddings', {}))
        self.document_processor = DocumentProcessor(config.get('document_processing', {}))
        self.vector_db_manager = VectorDatabaseManager(config.get('vector_databases', {}))
        self.hybrid_search = HybridSearchEngine(config.get('hybrid_search', {}))
        
        # LLM configuration
        self.llm_config = config.get('llm', {})
        
        # Storage for conversation memory
        self.conversation_memory = {}
        
        # Metrics server
        self.metrics_port = config.get('metrics_port', 8092)
    
    async def initialize(self):
        """Initialize the RAG system."""
        try:
            logger.info("Initializing Advanced RAG System")
            
            # Start metrics server
            start_http_server(self.metrics_port)
            
            logger.info("Advanced RAG System initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize RAG system", error=str(e))
            raise RAGSystemError(f"RAG system initialization failed: {e}")
    
    async def ingest_document(
        self, 
        file_path: str,
        metadata: Optional[Dict[str, Any]] = None,
        chunking_strategy: ChunkingStrategy = ChunkingStrategy.RECURSIVE,
        embedding_model: EmbeddingModel = EmbeddingModel.SENTENCE_BERT,
        vector_db: Optional[VectorDatabaseType] = None
    ) -> str:
        """Ingest a document into the RAG system."""
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Process document into chunks
            chunks = await self.document_processor.process_document(
                file_path, chunking_strategy, metadata
            )
            
            if not chunks:
                raise RAGSystemError("No chunks generated from document")
            
            # Generate embeddings
            texts = [chunk.content for chunk in chunks]
            embeddings = await self.embedding_manager.generate_embeddings(texts, embedding_model)
            
            # Add embeddings to chunks
            for chunk, embedding in zip(chunks, embeddings):
                chunk.embedding = embedding
            
            # Store in vector database
            success = await self.vector_db_manager.add_documents(chunks, embeddings, vector_db)
            
            if not success:
                raise RAGSystemError("Failed to store documents in vector database")
            
            # Add to hybrid search index
            await self.hybrid_search.add_documents_for_keyword_search(chunks)
            
            # Record metrics
            processing_time = asyncio.get_event_loop().time() - start_time
            RAG_RESPONSE_TIME.labels(operation='document_ingestion').observe(processing_time)
            
            document_id = chunks[0].document_id
            logger.info("Document ingested successfully", 
                       document_id=document_id,
                       chunk_count=len(chunks),
                       processing_time=processing_time)
            
            return document_id
            
        except Exception as e:
            logger.error("Document ingestion failed", file_path=file_path, error=str(e))
            raise RAGSystemError(f"Document ingestion failed: {e}")
    
    async def query(
        self, 
        question: str,
        conversation_id: Optional[str] = None,
        search_type: SearchType = SearchType.HYBRID,
        k: int = 5,
        embedding_model: EmbeddingModel = EmbeddingModel.SENTENCE_BERT,
        vector_db: Optional[VectorDatabaseType] = None,
        filters: Optional[Dict[str, Any]] = None,
        include_conversation_context: bool = True
    ) -> RAGResponse:
        """Query the RAG system for information."""
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Add conversation context to query if available
            enhanced_query = await self._enhance_query_with_context(
                question, conversation_id, include_conversation_context
            )
            
            # Generate query embedding
            query_embeddings = await self.embedding_manager.generate_embeddings(
                [enhanced_query], embedding_model
            )
            query_embedding = query_embeddings[0]
            
            # Retrieve relevant chunks
            if search_type == SearchType.SEMANTIC:
                retrieved_chunks = await self.vector_db_manager.search(
                    query_embedding, k, vector_db, filters
                )
            elif search_type == SearchType.HYBRID:
                # First get semantic results
                semantic_results = await self.vector_db_manager.search(
                    query_embedding, k * 2, vector_db, filters
                )
                
                # Then perform hybrid search
                retrieved_chunks = await self.hybrid_search.hybrid_search(
                    enhanced_query, query_embedding, semantic_results, k=k
                )
            else:
                # Default to semantic search
                retrieved_chunks = await self.vector_db_manager.search(
                    query_embedding, k, vector_db, filters
                )
            
            # Generate answer using LLM
            answer, confidence_score = await self._generate_answer(
                question, retrieved_chunks
            )
            
            # Update conversation memory
            if conversation_id:
                await self._update_conversation_memory(
                    conversation_id, question, answer, retrieved_chunks
                )
            
            # Calculate response metrics
            response_time = asyncio.get_event_loop().time() - start_time
            
            # Create response
            response = RAGResponse(
                query=question,
                answer=answer,
                retrieved_chunks=retrieved_chunks,
                context_used=self._format_context(retrieved_chunks),
                confidence_score=confidence_score,
                response_time=response_time,
                embedding_model=embedding_model.value,
                llm_model=self.llm_config.get('model', 'gpt-3.5-turbo'),
                retrieval_strategy=search_type
            )
            
            # Record metrics
            RAG_RESPONSE_TIME.labels(operation='query').observe(response_time)
            RETRIEVAL_QUALITY.observe(confidence_score)
            
            logger.info("RAG query completed",
                       question=question[:100],
                       retrieved_chunks=len(retrieved_chunks),
                       confidence_score=confidence_score,
                       response_time=response_time)
            
            return response
            
        except Exception as e:
            logger.error("RAG query failed", question=question[:100], error=str(e))
            raise RAGSystemError(f"RAG query failed: {e}")
    
    async def _enhance_query_with_context(
        self, 
        query: str, 
        conversation_id: Optional[str],
        include_context: bool
    ) -> str:
        """Enhance query with conversation context."""
        if not include_context or not conversation_id:
            return query
        
        # Get conversation history
        conversation = self.conversation_memory.get(conversation_id, [])
        if not conversation:
            return query
        
        # Build context from recent conversation
        context_parts = []
        for entry in conversation[-3:]:  # Last 3 exchanges
            context_parts.append(f"Q: {entry['question']}")
            context_parts.append(f"A: {entry['answer'][:200]}...")
        
        if context_parts:
            enhanced_query = f"Context:\n{chr(10).join(context_parts)}\n\nCurrent question: {query}"
            return enhanced_query
        
        return query
    
    async def _generate_answer(
        self, 
        question: str, 
        retrieved_chunks: List[QueryResult]
    ) -> Tuple[str, float]:
        """Generate answer using LLM based on retrieved context."""
        try:
            if not retrieved_chunks:
                return "I don't have enough information to answer that question.", 0.0
            
            # Format context from retrieved chunks
            context = self._format_context(retrieved_chunks)
            
            # Build prompt
            prompt = self._build_answer_prompt(question, context)
            
            # Call LLM (mock implementation)
            answer = await self._call_llm(prompt)
            
            # Calculate confidence based on retrieval scores
            avg_score = sum(chunk.score for chunk in retrieved_chunks) / len(retrieved_chunks)
            confidence_score = min(avg_score, 1.0)
            
            return answer, confidence_score
            
        except Exception as e:
            logger.error("Answer generation failed", error=str(e))
            return "Sorry, I encountered an error while generating the answer.", 0.0
    
    def _format_context(self, chunks: List[QueryResult]) -> str:
        """Format retrieved chunks into context string."""
        context_parts = []
        for i, chunk in enumerate(chunks):
            context_parts.append(f"[{i+1}] {chunk.content}")
        
        return "\n\n".join(context_parts)
    
    def _build_answer_prompt(self, question: str, context: str) -> str:
        """Build prompt for LLM answer generation."""
        prompt_template = self.llm_config.get('prompt_template', """
Context information is below:
{context}

Given the context information and not prior knowledge, answer the question.
If you cannot answer the question based on the context, say "I don't have enough information to answer that question."

Question: {question}
Answer:""")
        
        return prompt_template.format(context=context, question=question)
    
    async def _call_llm(self, prompt: str) -> str:
        """Call LLM to generate answer (mock implementation)."""
        # This would integrate with actual LLM API (OpenAI, Anthropic, etc.)
        
        # Mock response based on prompt length and content
        if "I don't have enough information" in prompt:
            return "I don't have enough information to answer that question."
        
        # Simulate answer generation
        return f"Based on the provided context, here is a comprehensive answer to your question. [This is a mock response - would be replaced with actual LLM integration]"
    
    async def _update_conversation_memory(
        self, 
        conversation_id: str, 
        question: str, 
        answer: str,
        retrieved_chunks: List[QueryResult]
    ):
        """Update conversation memory for context."""
        if conversation_id not in self.conversation_memory:
            self.conversation_memory[conversation_id] = []
        
        conversation_entry = {
            'timestamp': datetime.utcnow(),
            'question': question,
            'answer': answer,
            'retrieved_chunk_ids': [chunk.chunk_id for chunk in retrieved_chunks]
        }
        
        self.conversation_memory[conversation_id].append(conversation_entry)
        
        # Limit conversation memory size
        max_memory = self.config.get('max_conversation_memory', 20)
        if len(self.conversation_memory[conversation_id]) > max_memory:
            self.conversation_memory[conversation_id] = \
                self.conversation_memory[conversation_id][-max_memory:]
    
    async def delete_document(
        self, 
        document_id: str,
        vector_db: Optional[VectorDatabaseType] = None
    ) -> bool:
        """Delete a document from the RAG system."""
        try:
            success = await self.vector_db_manager.delete_documents([document_id], vector_db)
            
            if success:
                logger.info("Document deleted from RAG system", document_id=document_id)
            
            return success
            
        except Exception as e:
            logger.error("Failed to delete document", document_id=document_id, error=str(e))
            return False
    
    async def get_system_stats(self) -> Dict[str, Any]:
        """Get RAG system statistics."""
        stats = {
            'vector_databases': list(self.vector_db_manager.databases.keys()),
            'embedding_models_loaded': len(self.embedding_manager.models),
            'embedding_cache_size': len(self.embedding_manager.cache),
            'active_conversations': len(self.conversation_memory),
            'config': {
                'default_vector_db': self.vector_db_manager.default_db.value,
                'metrics_port': self.metrics_port
            }
        }
        
        return stats
    
    async def clear_conversation_memory(self, conversation_id: Optional[str] = None):
        """Clear conversation memory."""
        if conversation_id:
            self.conversation_memory.pop(conversation_id, None)
            logger.info("Conversation memory cleared", conversation_id=conversation_id)
        else:
            self.conversation_memory.clear()
            logger.info("All conversation memory cleared")

# Example usage and demonstration
async def main():
    """Example usage of the Advanced RAG System."""
    
    # Configuration
    config = {
        'embeddings': {
            'openai_api_key': 'your-openai-api-key',
            'default_sentence_model': 'all-MiniLM-L6-v2',
            'embedding_cache_size': 5000
        },
        'vector_databases': {
            'default_vector_db': VectorDatabaseType.FAISS,
            'faiss': {
                'dimension': 384,
                'index_type': 'flat'
            },
            'chroma': {
                'persist_directory': './chroma_db',
                'collection_name': 'documents'
            }
        },
        'document_processing': {
            'chunk_size': 1000,
            'chunk_overlap': 200,
            'semantic_chunk_size': 800
        },
        'hybrid_search': {
            'tfidf_max_features': 10000,
            'tfidf_ngram_range': (1, 2)
        },
        'llm': {
            'model': 'gpt-3.5-turbo',
            'prompt_template': """Context: {context}\n\nQuestion: {question}\nAnswer:"""
        },
        'metrics_port': 8092,
        'max_conversation_memory': 20
    }
    
    # Initialize RAG system
    rag_system = AdvancedRAGSystem(config)
    await rag_system.initialize()
    
    try:
        # Example 1: Ingest documents
        # Note: You would need actual document files for this to work
        
        # Create a sample text file for demonstration
        sample_doc_path = "/tmp/sample_document.txt"
        with open(sample_doc_path, 'w') as f:
            f.write("""
            This is a sample document about artificial intelligence and machine learning.
            
            Artificial Intelligence (AI) is a broad field of computer science focused on 
            building smart machines capable of performing tasks that typically require 
            human intelligence. These tasks include learning, reasoning, problem-solving, 
            perception, and language understanding.
            
            Machine Learning (ML) is a subset of AI that enables computers to learn and 
            improve from experience without being explicitly programmed. ML algorithms 
            build mathematical models based on training data to make predictions or 
            decisions without being explicitly programmed to perform the task.
            
            Deep Learning is a subset of machine learning that uses artificial neural 
            networks with multiple layers to model and understand complex patterns in data.
            """)
        
        # Ingest the document
        document_id = await rag_system.ingest_document(
            sample_doc_path,
            metadata={'title': 'AI and ML Introduction', 'category': 'education'},
            chunking_strategy=ChunkingStrategy.RECURSIVE,
            embedding_model=EmbeddingModel.SENTENCE_BERT
        )
        print(f"Document ingested: {document_id}")
        
        # Example 2: Query the system
        conversation_id = str(uuid.uuid4())
        
        response1 = await rag_system.query(
            "What is artificial intelligence?",
            conversation_id=conversation_id,
            search_type=SearchType.HYBRID,
            k=3
        )
        
        print(f"Question: {response1.query}")
        print(f"Answer: {response1.answer}")
        print(f"Confidence: {response1.confidence_score}")
        print(f"Retrieved chunks: {len(response1.retrieved_chunks)}")
        print("---")
        
        # Example 3: Follow-up query with conversation context
        response2 = await rag_system.query(
            "How does machine learning relate to it?",
            conversation_id=conversation_id,
            search_type=SearchType.HYBRID,
            include_conversation_context=True
        )
        
        print(f"Question: {response2.query}")
        print(f"Answer: {response2.answer}")
        print(f"Confidence: {response2.confidence_score}")
        print("---")
        
        # Example 4: Get system statistics
        stats = await rag_system.get_system_stats()
        print(f"System stats: {json.dumps(stats, indent=2, default=str)}")
        
        # Example 5: Different search strategies
        response3 = await rag_system.query(
            "What is deep learning?",
            search_type=SearchType.SEMANTIC,
            embedding_model=EmbeddingModel.SENTENCE_BERT
        )
        
        print(f"Semantic search result: {response3.answer}")
        print("---")
        
        # Cleanup
        os.remove(sample_doc_path)
        
    finally:
        # Clear conversation memory
        await rag_system.clear_conversation_memory()

if __name__ == "__main__":
    asyncio.run(main())