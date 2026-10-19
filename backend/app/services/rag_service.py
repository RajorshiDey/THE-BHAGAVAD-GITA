import os
from langchain_chroma import Chroma
from langchain_community.embeddings import FastEmbedEmbeddings
from app.core.config import settings

class RAGService:
    def __init__(self):
        self.persist_directory = os.path.join(os.path.dirname(__file__), "../../data/chroma_db")
        self.collection_name = "bhagavad_gita"
        self._embeddings = None
        self._vector_store = None

    @property
    def vector_store(self) -> Chroma:
        """Lazy-loads the vector store only when requested to keep server boot memory under 50 MB."""
        if self._vector_store is None:
            self._embeddings = FastEmbedEmbeddings(model_name=settings.EMBEDDING_MODEL_NAME)
            self._vector_store = Chroma(
                collection_name=self.collection_name,
                embedding_function=self._embeddings,
                persist_directory=self.persist_directory
            )
        return self._vector_store

    def retrieve_context(self, query: str, k: int = 3):
        """Retrieves top k relevant verses using lazy-loaded vector store."""
        return self.vector_store.similarity_search(query=query, k=k)

# Global Instance (boots instantly without loading heavy models into RAM)
rag_service = RAGService()