"""
Test script to validate Pinecone retrieval.
Shows which chunks are retrieved for different queries.
"""
import os
from openai import OpenAI
from pinecone import Pinecone

# Configuration
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSION = 512
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "portfolio-embeddings")

# Test queries
TEST_QUERIES = [
    "Tell me about your pets",
    "What projects have you built at Sansio?",
    "What's your background in healthcare?",
    "How do you use AI tools in your work?",
    "Tell me about rock climbing",
]


def test_query(query: str, openai_client: OpenAI, pinecone_index):
    """Test a single query and print results."""
    print(f"\n{'='*80}")
    print(f"QUERY: {query}")
    print(f"{'='*80}\n")
    
    # Generate embedding
    query_embedding = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=query,
        dimensions=EMBEDDING_DIMENSION
    ).data[0].embedding
    
    # Always retrieve bio chunk
    bio_results = pinecone_index.query(
        vector=query_embedding,
        top_k=1,
        filter={"type": "bio"},
        include_metadata=True
    )
    
    # Retrieve 3 other relevant chunks
    other_results = pinecone_index.query(
        vector=query_embedding,
        top_k=3,
        filter={"type": {"$ne": "bio"}},
        include_metadata=True
    )
    
    # Print bio
    print("BIO CHUNK (always included):")
    if bio_results.matches:
        match = bio_results.matches[0]
        print(f"  ID: {match.id}")
        print(f"  Type: {match.metadata.get('type')}")
        print(f"  Score: {match.score:.4f}")
        content = match.metadata.get("content", "")
        print(f"  Content preview: {content[:200]}...")
    else:
        print("  No bio chunk found!")
    
    # Print other chunks
    print(f"\nRELEVANT CHUNKS (top 3):")
    for i, match in enumerate(other_results.matches, 1):
        print(f"\n  [{i}] ID: {match.id}")
        print(f"      Type: {match.metadata.get('type')}")
        print(f"      Score: {match.score:.4f}")
        content = match.metadata.get("content", "")
        print(f"      Content preview: {content[:200]}...")


def main():
    print("Initializing clients...")
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    pinecone_client = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    pinecone_index = pinecone_client.Index(PINECONE_INDEX_NAME)
    
    print(f"\nTesting retrieval with {len(TEST_QUERIES)} queries...")
    
    for query in TEST_QUERIES:
        test_query(query, openai_client, pinecone_index)
    
    print(f"\n{'='*80}")
    print("Testing complete!")
    print(f"{'='*80}\n")


if __name__ == "__main__":
    main()
