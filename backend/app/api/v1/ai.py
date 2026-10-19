from fastapi import APIRouter, HTTPException
from typing import List
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document

from app.schemas.gita import AIAskRequest, AIAskResponse, AIReference
from app.services.rag_service import rag_service
from app.services.data_loader import gita_repo # Import the data loader
from app.core.config import settings

router = APIRouter()

llm = ChatGroq(
    model="qwen/qwen3.8-27b",
    api_key=settings.LLM_API_KEY or "dummy-key-for-initialization",
    temperature=0.7 
)

@router.post("/ask", response_model=AIAskResponse)
def ask_ai(request: AIAskRequest):
    if not settings.LLM_API_KEY:
        raise HTTPException(status_code=500, detail="LLM API Key not configured on the server.")
        
    retrieved_docs = []

    # 1. Direct Verse Retrieval (If current_verse_id is provided)
    if request.current_verse_id and request.current_verse_id in gita_repo.verses:
        verse = gita_repo.verses[request.current_verse_id]
        
        # Build a manual document bypassing the vector store
        page_content = f"Chapter {verse.chapter}, Verse {verse.verse}\n"
        page_content += f"Translation: {verse.translation}\n"
        if verse.explanation:
            page_content += f"Explanation: {verse.explanation}\n"
            
        retrieved_docs.append(Document(
            page_content=page_content, 
            metadata={"chapter": verse.chapter, "verse": verse.verse, "reason": "Directly requested by user"}
        ))
    
    # 2. Vector Search Fallback (If no verse ID is provided)
    else:
        retrieved_docs = rag_service.retrieve_context(request.question, k=3)
    
    if not retrieved_docs:
        return AIAskResponse(
            answer="I'm sorry, I couldn't find any relevant verses to answer your question.",
            references=[],
            used_context=False
        )
        
    # 3. Format Context for the Prompt
    context_text = "\n\n".join(
        [f"--- Chapter {doc.metadata['chapter']}, Verse {doc.metadata['verse']} ---\n{doc.page_content}" 
         for doc in retrieved_docs]
    )
    
    # 4. Enforce Grounding Rules
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an AI guide for the Bhagavad Gita. Your goal is to answer the user's question based ONLY on the provided retrieved context. 
        
Rules:
1. Use only the supplied context for claims about the text. If the context is insufficient, state clearly that you cannot answer based on the provided text.
2. Never fabricate Sanskrit, verse numbers, translations, or commentary.
3. Clearly label your generated interpretation and practical suggestions as AI-generated.
4. Do not frame yourself as a spiritual authority.
5. Provide explicit citations in your text referencing [Chapter X, Verse Y].

Retrieved Context:
{context}"""),
        ("user", "{question}")
    ])
    
    # 5. Generate Answer
    chain = prompt | llm
    response = chain.invoke({"context": context_text, "question": request.question})
    
    # 6. Format the API Response
    references = [
        AIReference(
            chapter=doc.metadata["chapter"],
            verse=doc.metadata["verse"],
            reason=doc.metadata.get("reason", "Retrieved for semantic relevance.")
        ) for doc in retrieved_docs
    ]
        
    return AIAskResponse(
        answer=response.content,
        references=references,
        used_context=True,
        disclaimer="Interpretation is AI-generated; consult the cited source text."
    )

