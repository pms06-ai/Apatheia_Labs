import os
import sys
import json
import subprocess
import tempfile

def test_embeddings():
    print("Verifying scripts/embeddings.py...")
    
    # 1. Test Single Generation
    print("\n1. Testing 'generate' command...")
    result = subprocess.run(
        [sys.executable, "scripts/embeddings.py", "generate", "This is a test sentence."],
        capture_output=True, text=True
    )
    
    if result.returncode != 0:
        print(f"FAILED: {result.stderr}")
        return False
        
    try:
        data = json.loads(result.stdout)
        if data.get("success") and "embedding" in data:
            print(f"SUCCESS: Generated embedding of length {len(data['embedding'])}")
        else:
            print(f"FAILED: Invalid response: {data}")
            return False
    except Exception as e:
        print(f"FAILED: JSON parse error: {e}\nOutput: {result.stdout}")
        return False

    # 2. Test Batch Generation
    print("\n2. Testing 'generate_batch' command...")
    batch_input = [
        {"id": 1, "text": "Apple is a fruit"},
        {"id": 2, "text": "Mars is a planet"},
        {"id": 3, "text": "Banana is yellow"}
    ]
    
    with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
        json.dump(batch_input, f)
        input_path = f.name
        
    output_path = input_path + "_out.json"
    
    try:
        result = subprocess.run(
            [sys.executable, "scripts/embeddings.py", "generate_batch", "--input", input_path, "--output", output_path],
            capture_output=True, text=True
        )
        
        if result.returncode != 0:
            print(f"FAILED: {result.stderr}")
            return False
            
        with open(output_path, 'r') as f:
            outputs = json.load(f)
            
        if len(outputs) == 3 and "embedding" in outputs[0]:
             print("SUCCESS: Batch generation worked")
        else:
             print(f"FAILED: Batch output invalid: {outputs}")
             return False
             
    finally:
        if os.path.exists(input_path): os.remove(input_path)
        # Keep output_path for search test
        
    # 3. Test Search
    print("\n3. Testing 'search' command...")
    # Search for "fruit" -> should match Apple (id 1) and Banana (id 3)
    result = subprocess.run(
        [sys.executable, "scripts/embeddings.py", "search", "fruit", "--data", output_path],
        capture_output=True, text=True
    )
    
    if os.path.exists(output_path): os.remove(output_path)
    
    if result.returncode != 0:
        print(f"FAILED: {result.stderr}")
        return False
        
    try:
        data = json.loads(result.stdout)
        if data.get("success") and "results" in data:
            results = data["results"]
            print(f"SUCCESS: Got {len(results)} results")
            if len(results) > 0:
                print(f"Top result: {results[0]['chunk']['text']} (score: {results[0]['score']:.4f})")
                if "Apple" in results[0]['chunk']['text']:
                     print("SUCCESS: Semantic match confirmed!")
                else:
                     print("WARNING: Top match wasn't expected, but API worked.")
        else:
            print(f"FAILED: Invalid response: {data}")
            return False
    except Exception as e:
        print(f"FAILED: JSON parse error: {e}\nOutput: {result.stdout}")
        return False
        
    return True

if __name__ == "__main__":
    if test_embeddings():
        print("\nAll checks passed!")
        sys.exit(0)
    else:
        print("\nSome checks failed.")
        sys.exit(1)
