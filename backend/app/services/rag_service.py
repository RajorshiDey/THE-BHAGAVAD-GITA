import os
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from app.services.data_loader import gita_repo
from app.core.config import settings

class RAGService:
    def __init__(self):
        # Using the local embedding model specified in config
        self.embeddings = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL_NAME)
        self.persist_directory = os.path.join(os.path.dirname(__file__), "../../data/chroma_db")
        self.collection_name = "bhagavad_gita"
        self.vector_store = self._initialize_vector_store()

    def _initialize_vector_store(self) -> Chroma:
        # Load existing vector store if it has already been built
        if os.path.exists(self.persist_directory):
            return Chroma(
                collection_name=self.collection_name,
                embedding_function=self.embeddings,
                persist_directory=self.persist_directory
            )
        
        # Otherwise, generate embeddings from the JSON data
        documents = []
        for verse_id, verse in gita_repo.verses.items():
            page_content = f"Chapter {verse.chapter}, Verse {verse.verse}\n"
            page_content += f"Translation: {verse.translation}\n"
            if verse.explanation:
                page_content += f"Explanation: {verse.explanation}\n"
            
            metadata = {
                "verse_id": verse_id,
                "chapter": verse.chapter,
                "verse": verse.verse
            }
            documents.append(Document(page_content=page_content, metadata=metadata))
            
        return Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            collection_name=self.collection_name,
            persist_directory=self.persist_directory
        )

    def retrieve_context(self, query: str, k: int = 3):
        """Retrieves the top k most relevant verses for a given query."""
        return self.vector_store.similarity_search(query=query, k=k)

# Global Instance
rag_service = RAGService()