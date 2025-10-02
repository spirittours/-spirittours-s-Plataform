"""
RAG (Retrieval Augmented Generation) Autonomous System
Sistema de IA autónomo con aprendizaje continuo para Spirit Tours
Capacidades:
- Procesamiento de lenguaje natural multilingüe
- Base de conocimientos vectorial
- Aprendizaje continuo de cada interacción
- Toma de decisiones autónoma
- Generación de respuestas contextuales
- Análisis de sentimiento e intención
"""

import asyncio
import json
import os
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
import hashlib
import pickle
import logging
from collections import defaultdict

# LangChain components
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Chroma
from langchain.chains import ConversationalRetrievalChain, LLMChain
from langchain.memory import ConversationBufferMemory, ConversationSummaryBufferMemory
from langchain.prompts import PromptTemplate
from langchain.schema import Document, BaseRetriever
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler

# LLM providers
from langchain.llms import LlamaCpp, GPT4All, HuggingFacePipeline
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM

# Vector DB
import chromadb
from chromadb.config import Settings

# Embeddings and ML
from sentence_transformers import SentenceTransformer
import torch
import faiss

logger = logging.getLogger(__name__)

class IntentType(Enum):
    BOOKING = "booking"
    INQUIRY = "inquiry"
    SUPPORT = "support"
    COMPLAINT = "complaint"
    FEEDBACK = "feedback"
    CANCELLATION = "cancellation"
    MODIFICATION = "modification"
    PAYMENT = "payment"
    RECOMMENDATION = "recommendation"
    NAVIGATION = "navigation"

class SentimentScore(Enum):
    VERY_NEGATIVE = -2
    NEGATIVE = -1
    NEUTRAL = 0
    POSITIVE = 1
    VERY_POSITIVE = 2

class AgentRole(Enum):
    BOOKING_SPECIALIST = "booking_specialist"
    TOUR_EXPERT = "tour_expert"
    CUSTOMER_SUCCESS = "customer_success"
    PAYMENT_PROCESSOR = "payment_processor"
    COMPLAINT_HANDLER = "complaint_handler"
    RECOMMENDATION_ENGINE = "recommendation_engine"
    LANGUAGE_TRANSLATOR = "language_translator"
    EMERGENCY_RESPONDER = "emergency_responder"

@dataclass
class Context:
    """Contexto de conversación"""
    user_id: str
    session_id: str
    language: str
    location: Optional[Dict[str, float]] = None
    preferences: Dict[str, Any] = None
    history: List[Dict[str, str]] = None
    metadata: Dict[str, Any] = None
    
@dataclass
class Knowledge:
    """Unidad de conocimiento"""
    id: str
    content: str
    embedding: Optional[np.ndarray] = None
    metadata: Dict[str, Any] = None
    source: str = "system"
    confidence: float = 1.0
    created_at: datetime = None
    updated_at: datetime = None
    access_count: int = 0
    
@dataclass
class Decision:
    """Decisión autónoma"""
    id: str
    action: str
    confidence: float
    reasoning: str
    alternatives: List[Dict[str, Any]] = None
    executed: bool = False
    result: Optional[Any] = None
    
@dataclass
class Learning:
    """Aprendizaje del sistema"""
    pattern: str
    response: str
    success_rate: float
    usage_count: int
    last_used: datetime
    feedback_score: float
    
class AutonomousRAGSystem:
    """
    Sistema RAG autónomo con capacidades de aprendizaje continuo
    Procesa, aprende y responde sin intervención humana
    """
    
    def __init__(self, model_path: Optional[str] = None):
        # Configuration
        self.model_path = model_path or "models/llama-2-7b-chat.gguf"
        self.vector_db_path = "data/vector_db"
        self.knowledge_base_path = "data/knowledge"
        
        # Initialize components
        self.llm = None
        self.embeddings = None
        self.vector_store = None
        self.retriever = None
        self.qa_chain = None
        
        # Memory systems
        self.short_term_memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer"
        )
        
        self.long_term_memory = ConversationSummaryBufferMemory(
            llm=self.llm,
            max_token_limit=2000,
            return_messages=True
        )
        
        # Knowledge management
        self.knowledge_base: Dict[str, Knowledge] = {}
        self.learning_patterns: Dict[str, Learning] = {}
        self.decision_history: List[Decision] = []
        
        # Agent specialists
        self.agents: Dict[AgentRole, Any] = {}
        
        # Performance metrics
        self.metrics = {
            "total_queries": 0,
            "successful_responses": 0,
            "failed_responses": 0,
            "average_confidence": 0.0,
            "learning_rate": 0.0,
            "user_satisfaction": 0.0
        }
        
        # Initialize system
        self._initialize_system()
        
    def _initialize_system(self):
        """Initialize all AI components"""
        try:
            # Initialize embeddings model (multilingual)
            self.embeddings = HuggingFaceEmbeddings(
                model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                model_kwargs={'device': 'cpu'},
                encode_kwargs={'normalize_embeddings': True}
            )
            
            # Initialize vector store with ChromaDB
            self.vector_store = Chroma(
                collection_name="spirit_tours_knowledge",
                embedding_function=self.embeddings,
                persist_directory=self.vector_db_path,
                client_settings=Settings(
                    anonymized_telemetry=False,
                    persist_directory=self.vector_db_path
                )
            )
            
            # Initialize LLM (using open-source model)
            self._initialize_llm()
            
            # Initialize retriever
            self.retriever = self.vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 5}
            )
            
            # Initialize QA chain
            self._initialize_qa_chain()
            
            # Initialize specialized agents
            self._initialize_agents()
            
            # Load existing knowledge base
            self._load_knowledge_base()
            
            logger.info("✅ RAG Autonomous System initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ System initialization failed: {e}")
            
    def _initialize_llm(self):
        """Initialize Large Language Model"""
        try:
            # Try to use Llama 2 (open source, no API needed)
            if os.path.exists(self.model_path):
                self.llm = LlamaCpp(
                    model_path=self.model_path,
                    temperature=0.7,
                    max_tokens=2000,
                    top_p=0.95,
                    callback_manager=None,
                    verbose=False,
                    n_ctx=2048,
                    n_batch=8,
                    n_threads=4
                )
            else:
                # Fallback to GPT4All (smaller, faster)
                self.llm = GPT4All(
                    model="ggml-gpt4all-j-v1.3-groovy.bin",
                    max_tokens=1000,
                    temp=0.7,
                    n_threads=4
                )
                
        except Exception as e:
            logger.warning(f"Local LLM initialization failed: {e}")
            # Fallback to Hugging Face model
            self._initialize_huggingface_llm()
            
    def _initialize_huggingface_llm(self):
        """Fallback to Hugging Face model"""
        model_name = "microsoft/DialoGPT-medium"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForCausalLM.from_pretrained(model_name)
        
        pipe = pipeline(
            "text-generation",
            model=model,
            tokenizer=tokenizer,
            max_length=1000,
            temperature=0.7,
            top_p=0.95
        )
        
        self.llm = HuggingFacePipeline(pipeline=pipe)
        
    def _initialize_qa_chain(self):
        """Initialize Question-Answering chain"""
        template = """You are an advanced AI assistant for Spirit Tours, a spiritual tourism platform.
        Use the following context to answer the question at the end.
        If you don't know the answer, say you don't know. Don't make up information.
        Always be helpful, professional, and empathetic.
        
        Context: {context}
        
        Chat History: {chat_history}
        
        Question: {question}
        
        Answer in the same language as the question.
        Provide detailed, accurate responses.
        
        Answer:"""
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["context", "chat_history", "question"]
        )
        
        self.qa_chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.retriever,
            memory=self.short_term_memory,
            return_source_documents=True,
            combine_docs_chain_kwargs={"prompt": prompt}
        )
        
    def _initialize_agents(self):
        """Initialize specialized AI agents"""
        # Booking Specialist Agent
        self.agents[AgentRole.BOOKING_SPECIALIST] = self._create_specialist_agent(
            role="Booking Specialist",
            expertise="Tour bookings, availability, scheduling, reservations",
            instructions="Help users book tours, check availability, and manage reservations"
        )
        
        # Tour Expert Agent
        self.agents[AgentRole.TOUR_EXPERT] = self._create_specialist_agent(
            role="Tour Expert",
            expertise="Tour details, destinations, spiritual sites, local culture",
            instructions="Provide detailed information about tours, destinations, and spiritual experiences"
        )
        
        # Customer Success Agent
        self.agents[AgentRole.CUSTOMER_SUCCESS] = self._create_specialist_agent(
            role="Customer Success Manager",
            expertise="Customer satisfaction, problem resolution, service excellence",
            instructions="Ensure customer satisfaction and resolve any issues professionally"
        )
        
        # Payment Processor Agent
        self.agents[AgentRole.PAYMENT_PROCESSOR] = self._create_specialist_agent(
            role="Payment Specialist",
            expertise="Payment processing, refunds, invoicing, cryptocurrency",
            instructions="Handle payment-related queries and process transactions securely"
        )
        
        # Recommendation Engine
        self.agents[AgentRole.RECOMMENDATION_ENGINE] = self._create_specialist_agent(
            role="Recommendation Expert",
            expertise="Personalized recommendations, user preferences, tour matching",
            instructions="Provide personalized tour recommendations based on user preferences"
        )
        
    def _create_specialist_agent(self, role: str, expertise: str, instructions: str) -> LLMChain:
        """Create a specialized agent with specific role"""
        template = f"""You are a {role} for Spirit Tours.
        Your expertise: {expertise}
        Instructions: {instructions}
        
        User Query: {{query}}
        Context: {{context}}
        
        Provide a professional, helpful response:"""
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["query", "context"]
        )
        
        return LLMChain(llm=self.llm, prompt=prompt)
        
    async def process_query(
        self,
        query: str,
        context: Context,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Process user query with full RAG pipeline
        """
        self.metrics["total_queries"] += 1
        
        try:
            # 1. Analyze intent and sentiment
            intent = await self.analyze_intent(query)
            sentiment = await self.analyze_sentiment(query)
            
            # 2. Select appropriate agent
            agent = self._select_agent(intent)
            
            # 3. Retrieve relevant context
            relevant_docs = await self.retrieve_context(query)
            
            # 4. Generate response
            if agent:
                response = await self._generate_agent_response(
                    agent, query, relevant_docs, context
                )
            else:
                response = await self._generate_general_response(
                    query, relevant_docs, context
                )
                
            # 5. Learn from interaction
            await self.learn_from_interaction(
                query, response, intent, sentiment
            )
            
            # 6. Store decision
            decision = Decision(
                id=hashlib.md5(f"{query}{datetime.now()}".encode()).hexdigest(),
                action=f"respond_to_{intent.value}",
                confidence=response.get("confidence", 0.8),
                reasoning=response.get("reasoning", ""),
                executed=True,
                result=response
            )
            
            self.decision_history.append(decision)
            self.metrics["successful_responses"] += 1
            
            return {
                "success": True,
                "response": response.get("answer", ""),
                "intent": intent.value,
                "sentiment": sentiment.value,
                "confidence": response.get("confidence", 0.8),
                "sources": response.get("sources", []),
                "suggestions": await self.generate_suggestions(query, context),
                "agent": agent.value if agent else "general"
            }
            
        except Exception as e:
            logger.error(f"Query processing error: {e}")
            self.metrics["failed_responses"] += 1
            
            return {
                "success": False,
                "error": str(e),
                "fallback_response": await self.generate_fallback_response(query)
            }
            
    async def analyze_intent(self, query: str) -> IntentType:
        """
        Analyze user intent using NLP
        """
        query_lower = query.lower()
        
        # Intent keywords mapping
        intent_keywords = {
            IntentType.BOOKING: ["book", "reserve", "schedule", "availability", "tour"],
            IntentType.INQUIRY: ["what", "how", "when", "where", "tell me", "information"],
            IntentType.SUPPORT: ["help", "assist", "problem", "issue", "stuck"],
            IntentType.COMPLAINT: ["complaint", "angry", "disappointed", "terrible", "worst"],
            IntentType.FEEDBACK: ["feedback", "suggestion", "opinion", "review", "rate"],
            IntentType.CANCELLATION: ["cancel", "refund", "stop", "terminate"],
            IntentType.MODIFICATION: ["change", "modify", "update", "reschedule"],
            IntentType.PAYMENT: ["pay", "payment", "credit", "card", "invoice", "bill"],
            IntentType.RECOMMENDATION: ["recommend", "suggest", "best", "popular", "advice"],
            IntentType.NAVIGATION: ["where", "location", "map", "direction", "navigate"]
        }
        
        # Score each intent
        intent_scores = {}
        for intent, keywords in intent_keywords.items():
            score = sum(1 for keyword in keywords if keyword in query_lower)
            intent_scores[intent] = score
            
        # Return intent with highest score
        if max(intent_scores.values()) > 0:
            return max(intent_scores, key=intent_scores.get)
            
        return IntentType.INQUIRY  # Default
        
    async def analyze_sentiment(self, query: str) -> SentimentScore:
        """
        Analyze sentiment of user query
        """
        # Simplified sentiment analysis using keywords
        positive_words = ["great", "excellent", "amazing", "wonderful", "love", "perfect", "best"]
        negative_words = ["bad", "terrible", "awful", "worst", "hate", "disappointed", "angry"]
        
        query_lower = query.lower()
        
        positive_score = sum(1 for word in positive_words if word in query_lower)
        negative_score = sum(1 for word in negative_words if word in query_lower)
        
        if negative_score > positive_score:
            if negative_score >= 3:
                return SentimentScore.VERY_NEGATIVE
            return SentimentScore.NEGATIVE
        elif positive_score > negative_score:
            if positive_score >= 3:
                return SentimentScore.VERY_POSITIVE
            return SentimentScore.POSITIVE
            
        return SentimentScore.NEUTRAL
        
    def _select_agent(self, intent: IntentType) -> Optional[AgentRole]:
        """
        Select appropriate specialized agent based on intent
        """
        agent_mapping = {
            IntentType.BOOKING: AgentRole.BOOKING_SPECIALIST,
            IntentType.INQUIRY: AgentRole.TOUR_EXPERT,
            IntentType.SUPPORT: AgentRole.CUSTOMER_SUCCESS,
            IntentType.COMPLAINT: AgentRole.COMPLAINT_HANDLER,
            IntentType.PAYMENT: AgentRole.PAYMENT_PROCESSOR,
            IntentType.RECOMMENDATION: AgentRole.RECOMMENDATION_ENGINE,
            IntentType.CANCELLATION: AgentRole.BOOKING_SPECIALIST,
            IntentType.MODIFICATION: AgentRole.BOOKING_SPECIALIST
        }
        
        return agent_mapping.get(intent)
        
    async def retrieve_context(
        self,
        query: str,
        k: int = 5
    ) -> List[Document]:
        """
        Retrieve relevant context from vector store
        """
        try:
            # Retrieve similar documents
            docs = self.vector_store.similarity_search(query, k=k)
            
            # Update access count for retrieved knowledge
            for doc in docs:
                if doc.metadata.get("knowledge_id"):
                    knowledge_id = doc.metadata["knowledge_id"]
                    if knowledge_id in self.knowledge_base:
                        self.knowledge_base[knowledge_id].access_count += 1
                        
            return docs
            
        except Exception as e:
            logger.error(f"Context retrieval error: {e}")
            return []
            
    async def _generate_agent_response(
        self,
        agent: AgentRole,
        query: str,
        context_docs: List[Document],
        context: Context
    ) -> Dict[str, Any]:
        """
        Generate response using specialized agent
        """
        # Prepare context
        context_text = "\n".join([doc.page_content for doc in context_docs])
        
        # Get agent chain
        agent_chain = self.agents.get(agent)
        
        if agent_chain:
            response = agent_chain.run(
                query=query,
                context=context_text
            )
            
            return {
                "answer": response,
                "confidence": 0.85,
                "reasoning": f"Used specialized {agent.value} agent",
                "sources": [doc.metadata for doc in context_docs]
            }
            
        return await self._generate_general_response(query, context_docs, context)
        
    async def _generate_general_response(
        self,
        query: str,
        context_docs: List[Document],
        context: Context
    ) -> Dict[str, Any]:
        """
        Generate response using general QA chain
        """
        result = self.qa_chain({"question": query})
        
        return {
            "answer": result["answer"],
            "confidence": 0.75,
            "reasoning": "Generated using general QA chain",
            "sources": [doc.metadata for doc in result.get("source_documents", [])]
        }
        
    async def learn_from_interaction(
        self,
        query: str,
        response: Dict[str, Any],
        intent: IntentType,
        sentiment: SentimentScore,
        feedback: Optional[float] = None
    ):
        """
        Learn from user interaction to improve future responses
        """
        # Create learning pattern
        pattern_key = f"{intent.value}_{sentiment.value}"
        
        if pattern_key in self.learning_patterns:
            pattern = self.learning_patterns[pattern_key]
            pattern.usage_count += 1
            pattern.last_used = datetime.now()
            
            if feedback:
                # Update success rate with exponential moving average
                alpha = 0.1
                pattern.success_rate = (1 - alpha) * pattern.success_rate + alpha * feedback
                pattern.feedback_score = feedback
        else:
            # Create new learning pattern
            self.learning_patterns[pattern_key] = Learning(
                pattern=query,
                response=response.get("answer", ""),
                success_rate=feedback or 0.5,
                usage_count=1,
                last_used=datetime.now(),
                feedback_score=feedback or 0.5
            )
            
        # Update metrics
        self.metrics["learning_rate"] = len(self.learning_patterns) / max(self.metrics["total_queries"], 1)
        
    async def add_knowledge(
        self,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        source: str = "manual"
    ) -> Knowledge:
        """
        Add new knowledge to the system
        """
        # Create knowledge object
        knowledge = Knowledge(
            id=hashlib.md5(content.encode()).hexdigest(),
            content=content,
            metadata=metadata or {},
            source=source,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Generate embedding
        embedding = self.embeddings.embed_query(content)
        knowledge.embedding = np.array(embedding)
        
        # Store in knowledge base
        self.knowledge_base[knowledge.id] = knowledge
        
        # Add to vector store
        self.vector_store.add_texts(
            texts=[content],
            metadatas=[{
                "knowledge_id": knowledge.id,
                "source": source,
                **metadata
            }]
        )
        
        # Persist vector store
        self.vector_store.persist()
        
        logger.info(f"Added new knowledge: {knowledge.id}")
        
        return knowledge
        
    async def bulk_import_knowledge(
        self,
        documents: List[Dict[str, Any]],
        source: str = "import"
    ) -> int:
        """
        Bulk import knowledge documents
        """
        count = 0
        
        for doc in documents:
            try:
                await self.add_knowledge(
                    content=doc.get("content", ""),
                    metadata=doc.get("metadata", {}),
                    source=source
                )
                count += 1
                
            except Exception as e:
                logger.error(f"Failed to import document: {e}")
                
        logger.info(f"Imported {count} knowledge documents")
        
        return count
        
    async def generate_suggestions(
        self,
        query: str,
        context: Context
    ) -> List[str]:
        """
        Generate contextual suggestions for user
        """
        suggestions = []
        
        # Based on intent
        intent = await self.analyze_intent(query)
        
        if intent == IntentType.BOOKING:
            suggestions = [
                "View available dates",
                "Check group discounts",
                "See cancellation policy",
                "Add travel insurance"
            ]
        elif intent == IntentType.INQUIRY:
            suggestions = [
                "See similar tours",
                "Read customer reviews",
                "View photo gallery",
                "Download tour brochure"
            ]
        elif intent == IntentType.RECOMMENDATION:
            suggestions = [
                "Take our preference quiz",
                "See top-rated tours",
                "Browse by destination",
                "View seasonal specials"
            ]
            
        return suggestions[:3]  # Return top 3 suggestions
        
    async def generate_fallback_response(self, query: str) -> str:
        """
        Generate fallback response when main processing fails
        """
        fallback_responses = [
            "I understand you need help. Let me connect you with a human agent who can assist you better.",
            "I'm having trouble processing your request. Would you like to try rephrasing it?",
            "I want to help you with this. Can you provide more details about what you're looking for?",
            "Let me find someone who can better assist you with this specific request."
        ]
        
        import random
        return random.choice(fallback_responses)
        
    async def make_autonomous_decision(
        self,
        situation: Dict[str, Any]
    ) -> Decision:
        """
        Make autonomous decision based on situation
        """
        # Analyze situation
        situation_text = json.dumps(situation)
        intent = await self.analyze_intent(situation_text)
        
        # Retrieve relevant past decisions
        similar_decisions = self._find_similar_decisions(situation)
        
        # Generate decision
        decision = Decision(
            id=hashlib.md5(situation_text.encode()).hexdigest(),
            action="",
            confidence=0.0,
            reasoning="",
            alternatives=[]
        )
        
        # Decision logic based on situation type
        if situation.get("type") == "booking_request":
            decision.action = "process_booking"
            decision.confidence = 0.9
            decision.reasoning = "Standard booking request with all required information"
            
        elif situation.get("type") == "complaint":
            severity = situation.get("severity", "low")
            if severity == "high":
                decision.action = "escalate_to_human"
                decision.confidence = 0.95
                decision.reasoning = "High severity complaint requires human intervention"
            else:
                decision.action = "automated_resolution"
                decision.confidence = 0.8
                decision.reasoning = "Low severity issue can be handled automatically"
                
        elif situation.get("type") == "payment_issue":
            decision.action = "initiate_payment_check"
            decision.confidence = 0.85
            decision.reasoning = "Payment issues require verification process"
            
        # Store decision
        self.decision_history.append(decision)
        
        return decision
        
    def _find_similar_decisions(
        self,
        situation: Dict[str, Any],
        k: int = 3
    ) -> List[Decision]:
        """
        Find similar past decisions
        """
        # Simple similarity based on situation type
        situation_type = situation.get("type", "")
        
        similar = [
            d for d in self.decision_history
            if situation_type in d.reasoning
        ]
        
        return similar[:k]
        
    async def execute_decision(self, decision: Decision) -> Any:
        """
        Execute autonomous decision
        """
        try:
            if decision.action == "process_booking":
                # Execute booking logic
                result = {"status": "booking_processed", "confirmation": "BK" + decision.id[:8]}
                
            elif decision.action == "escalate_to_human":
                # Create escalation ticket
                result = {"status": "escalated", "ticket_id": "TK" + decision.id[:8]}
                
            elif decision.action == "automated_resolution":
                # Apply automated resolution
                result = {"status": "resolved", "resolution": "automated_fix_applied"}
                
            elif decision.action == "initiate_payment_check":
                # Check payment status
                result = {"status": "payment_checking", "check_id": "PC" + decision.id[:8]}
                
            else:
                result = {"status": "unknown_action"}
                
            decision.executed = True
            decision.result = result
            
            return result
            
        except Exception as e:
            logger.error(f"Decision execution error: {e}")
            return {"status": "error", "error": str(e)}
            
    def _load_knowledge_base(self):
        """
        Load existing knowledge base from disk
        """
        try:
            knowledge_file = os.path.join(self.knowledge_base_path, "knowledge.pkl")
            
            if os.path.exists(knowledge_file):
                with open(knowledge_file, "rb") as f:
                    self.knowledge_base = pickle.load(f)
                    
                logger.info(f"Loaded {len(self.knowledge_base)} knowledge items")
                
            # Load learning patterns
            patterns_file = os.path.join(self.knowledge_base_path, "patterns.pkl")
            
            if os.path.exists(patterns_file):
                with open(patterns_file, "rb") as f:
                    self.learning_patterns = pickle.load(f)
                    
                logger.info(f"Loaded {len(self.learning_patterns)} learning patterns")
                
        except Exception as e:
            logger.error(f"Failed to load knowledge base: {e}")
            
    def save_knowledge_base(self):
        """
        Save knowledge base to disk
        """
        try:
            # Create directory if not exists
            os.makedirs(self.knowledge_base_path, exist_ok=True)
            
            # Save knowledge base
            knowledge_file = os.path.join(self.knowledge_base_path, "knowledge.pkl")
            with open(knowledge_file, "wb") as f:
                pickle.dump(self.knowledge_base, f)
                
            # Save learning patterns
            patterns_file = os.path.join(self.knowledge_base_path, "patterns.pkl")
            with open(patterns_file, "wb") as f:
                pickle.dump(self.learning_patterns, f)
                
            # Persist vector store
            self.vector_store.persist()
            
            logger.info("Knowledge base saved successfully")
            
        except Exception as e:
            logger.error(f"Failed to save knowledge base: {e}")
            
    async def train_on_conversations(
        self,
        conversations: List[Dict[str, Any]]
    ):
        """
        Train system on past conversations
        """
        for conv in conversations:
            query = conv.get("query", "")
            response = conv.get("response", "")
            intent = IntentType(conv.get("intent", "inquiry"))
            sentiment = SentimentScore(conv.get("sentiment", 0))
            feedback = conv.get("feedback", 0.5)
            
            # Add to knowledge base
            await self.add_knowledge(
                content=f"Q: {query}\nA: {response}",
                metadata={"type": "conversation", "intent": intent.value},
                source="training"
            )
            
            # Learn pattern
            await self.learn_from_interaction(
                query, {"answer": response}, intent, sentiment, feedback
            )
            
    def get_system_metrics(self) -> Dict[str, Any]:
        """
        Get comprehensive system metrics
        """
        return {
            "performance": self.metrics,
            "knowledge_size": len(self.knowledge_base),
            "learning_patterns": len(self.learning_patterns),
            "decision_history": len(self.decision_history),
            "memory_usage": {
                "short_term": len(self.short_term_memory.buffer),
                "long_term": self.long_term_memory.max_token_limit
            },
            "agents_active": len(self.agents),
            "success_rate": (
                self.metrics["successful_responses"] / 
                max(self.metrics["total_queries"], 1)
            ) * 100
        }
        
    async def continuous_learning_loop(self):
        """
        Continuous learning background process
        """
        while True:
            try:
                # Analyze patterns
                self._analyze_learning_patterns()
                
                # Optimize knowledge base
                self._optimize_knowledge_base()
                
                # Update metrics
                self._update_system_metrics()
                
                # Save state
                self.save_knowledge_base()
                
                # Sleep for 1 hour
                await asyncio.sleep(3600)
                
            except Exception as e:
                logger.error(f"Continuous learning error: {e}")
                await asyncio.sleep(60)  # Retry after 1 minute
                
    def _analyze_learning_patterns(self):
        """
        Analyze and optimize learning patterns
        """
        # Remove old, unused patterns
        cutoff_date = datetime.now() - timedelta(days=30)
        
        patterns_to_remove = [
            key for key, pattern in self.learning_patterns.items()
            if pattern.last_used < cutoff_date and pattern.usage_count < 5
        ]
        
        for key in patterns_to_remove:
            del self.learning_patterns[key]
            
        logger.info(f"Removed {len(patterns_to_remove)} old patterns")
        
    def _optimize_knowledge_base(self):
        """
        Optimize knowledge base for better performance
        """
        # Sort knowledge by access count
        sorted_knowledge = sorted(
            self.knowledge_base.values(),
            key=lambda k: k.access_count,
            reverse=True
        )
        
        # Keep top 80% most accessed knowledge
        keep_count = int(len(sorted_knowledge) * 0.8)
        
        if len(sorted_knowledge) > 1000:  # Only optimize if large
            optimized = {k.id: k for k in sorted_knowledge[:keep_count]}
            self.knowledge_base = optimized
            
            logger.info(f"Optimized knowledge base to {len(optimized)} items")
            
    def _update_system_metrics(self):
        """
        Update system performance metrics
        """
        if self.metrics["total_queries"] > 0:
            self.metrics["average_confidence"] = sum(
                d.confidence for d in self.decision_history[-100:]
            ) / min(len(self.decision_history), 100)
            
            # Calculate user satisfaction from feedback
            recent_patterns = list(self.learning_patterns.values())[-100:]
            if recent_patterns:
                self.metrics["user_satisfaction"] = sum(
                    p.feedback_score for p in recent_patterns
                ) / len(recent_patterns)
                

# Create singleton instance
rag_system = AutonomousRAGSystem()