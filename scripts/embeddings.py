import os
import sys
import json
import argparse
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv(".env.local")

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print(json.dumps({"error": "GEMINI_API_KEY not found"}))
    sys.exit(1)

genai.configure(api_key=API_KEY)

# Use a lightweight embedding model
MODEL_NAME = "models/text-embedding-004"

def generate_embeddings(text):
    """Generate embeddings for a given text."""
    try:
        result = genai.embed_content(
            model=MODEL_NAME,
            content=text,
            task_type="retrieval_document",
            title="Embedded Document"
        )
        return result['embedding']
    except Exception as e:
        return None

def search_embeddings(query, chunk_data):
    """
    Search for most similar chunks.
    chunk_data: List of dicts {id, content, embedding_vector}
    """
    try:
        # Generate query embedding
        query_embedding_result = genai.embed_content(
            model=MODEL_NAME,
            content=query,
            task_type="retrieval_query"
        )
        query_vec = np.array(query_embedding_result['embedding']).reshape(1, -1)
        
        # Prepare document vectors
        doc_vecs = []
        valid_chunks = []
        
        for chunk in chunk_data:
            if chunk.get('embedding'):
                doc_vecs.append(chunk['embedding'])
                valid_chunks.append(chunk)
                
        if not doc_vecs:
            return []
            
        doc_vecs = np.array(doc_vecs)
        
        # Calculate cosine similarity
        similarities = cosine_similarity(query_vec, doc_vecs)[0]
        
        # Zip with chunks and sort
        results = []
        for i, score in enumerate(similarities):
            results.append({
                "chunk": valid_chunks[i],
                "score": float(score)
            })
            
        # Sort by score descending
        results.sort(key=lambda x: x['score'], reverse=True)
        
        # Return top 20
        return results[:20]
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        return []

def main():
    parser = argparse.ArgumentParser(description="Apatheia Embeddings Utility")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # Generate command
    gen_parser = subparsers.add_parser("generate")
    gen_parser.add_argument("text", help="Text to embed")
    
    # Generate Batch command
    batch_parser = subparsers.add_parser("generate_batch")
    batch_parser.add_argument("--input", help="Path to JSON file containing list of texts", required=True)
    batch_parser.add_argument("--output", help="Path to write JSON output with embeddings", required=True)
    
    # Search command
    search_parser = subparsers.add_parser("search")
    search_parser.add_argument("query", help="Search query")
    search_parser.add_argument("--data", help="Path to JSON file containing chunks with embeddings", required=False)
    # Alternatively accept raw JSON via stdin if needed, but file path is safer for large data
    
    args = parser.parse_args()
    
    if args.command == "generate":
        embedding = generate_embeddings(args.text)
        if embedding:
            print(json.dumps({"success": True, "embedding": embedding}))
        else:
            print(json.dumps({"success": False, "error": "Failed to generate embedding"}))
            
    elif args.command == "generate_batch":
        try:
            with open(args.input, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            results = []
            # data is expected to be list of {"id": X, "text": "..."}
            for item in data:
                emb = generate_embeddings(item["text"])
                item["embedding"] = emb
                results.append(item)
                
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(results, f)
                
            print(json.dumps({"success": True}))
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))

    elif args.command == "search":
        # For simplicity in this v1, we expect the caller (Rust) to pass the chunks 
        # But passing all chunks via CLI args is bad.
        # Better approach: Rust saves chunks to a temp JSON file, passes that path here.
        
        if not args.data or not os.path.exists(args.data):
             print(json.dumps({"error": "Data file required"}))
             return

        with open(args.data, 'r', encoding='utf-8') as f:
            chunks = json.load(f)
            
        results = search_embeddings(args.query, chunks)
        print(json.dumps({"success": True, "results": results}))

if __name__ == "__main__":
    main()
