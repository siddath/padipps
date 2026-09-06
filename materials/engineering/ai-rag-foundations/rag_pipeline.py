"""Unsolved LangChain + Chroma contracts for a fictional RAG system."""


def load_corpus(path):
    """Load and validate unique fictional documents from a JSON file."""
    raise NotImplementedError("TODO learner implementation")


def chunk_documents(documents, max_characters, overlap_characters):
    """Return chunks with stable IDs and complete source metadata."""
    raise NotImplementedError("TODO learner implementation")


def deterministic_embedding(text, dimensions=32):
    """Return a deterministic, non-zero wiring vector; this is not a quality model."""
    raise NotImplementedError("TODO learner implementation")


def build_chroma_store(chunks, persist_directory=None):
    """Create and populate a LangChain Chroma store in the learner-owned environment."""
    raise NotImplementedError("TODO learner implementation")


def retrieve(vector_store, question, k):
    """Return ranked chunks while preserving source metadata."""
    raise NotImplementedError("TODO learner implementation")


def generate_cited_answer(question, contexts, generator):
    """Call the passed generator and validate citations against supplied contexts."""
    raise NotImplementedError("TODO learner implementation")


def retrieval_metrics(retrieved_source_ids, expected_source_ids, k):
    """Return precision_at_k, recall_at_k and reciprocal_rank with explicit denominators."""
    raise NotImplementedError("TODO learner implementation")

