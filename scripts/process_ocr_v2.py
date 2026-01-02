"""
Apatheia Labs — Gemini OCR Processor v2
Usage:
    python scripts/process_ocr_v2.py --input "path/to/folder_or_pdf" --output "path/to/output"

Prerequisites:
    pip install -r requirements.txt
    Add GEMINI_API_KEY to .env or environment variables

Logic:
    1. Iterates over PDFs in input directory.
    2. Converts pages to images (pdf2image).
    3. Sends to Gemini 1.5 Flash for high-fidelity markdown transcription.
    4. Saves output as .md files.
    5. Implements checkpointing to resume if interrupted.
"""

import os
import sys
import argparse
import time
import glob
import io
import hashlib
import json
from pathlib import Path
from tqdm import tqdm
from PIL import Image
from dotenv import load_dotenv
import google.generativeai as genai
from pdf2image import convert_from_path

# Load environment variables
load_dotenv()
load_dotenv(".env.local")

API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

if not API_KEY:
    print("[ERROR] GEMINI_API_KEY or GOOGLE_API_KEY not found in environment.")
    sys.exit(1)

genai.configure(api_key=API_KEY)

# Configuration
MODEL_NAME = "gemini-2.0-flash"
poppler_path = None # Assume in PATH or set manually if on Windows without PATH

def get_file_hash(file_path):
    """SHA256 hash of file to track changes."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def process_page(image, page_num):
    """Process a single page image with Gemini."""
    model = genai.GenerativeModel(MODEL_NAME)
    
    prompt = """
    You are a forensic document analyst. Transcribe this page exactly into Markdown.
    
    Rules:
    1. Preserve all formatting, bolding, and headers.
    2. Convert tables into Markdown tables.
    3. If text is illegible, write [UNCLEAR].
    4. Do not add any conversational text, preamble, or markdown code fences (```).
    5. Return ONLY the content.
    """
    
    try:
        response = model.generate_content([prompt, image])
        return response.text
    except Exception as e:
        print(f"  [WARN] Error processing page {page_num}: {e}")
        return f"[ERROR PROCESSING PAGE {page_num}]"

def process_pdf(pdf_path, output_dir):
    """Process a full PDF."""
    pdf_name = Path(pdf_path).stem
    output_path = output_dir / f"{pdf_name}.md"
    
    # Check if already done
    if output_path.exists():
        print(f"[SKIP] {pdf_name} (already exists)")
        return

    print(f"[PDF] Processing: {pdf_name}")
    
    try:
        # Convert to images
        # Note: On Windows, poppler must be installed and in PATH
        images = convert_from_path(pdf_path, dpi=300)
    except Exception as e:
        print(f"[ERROR] Converting PDF to images: {e}")
        print("   (Ensure Poppler is installed and in PATH)")
        return

    full_text = f"# {pdf_name}\n\n"
    
    for i, image in enumerate(tqdm(images, desc=f"   Pages ({pdf_name})")):
        page_num = i + 1
        page_text = process_page(image, page_num)
        
        full_text += f"\n\n## Page {page_num}\n\n"
        full_text += page_text
        
        # Rate limit safety
        time.sleep(1)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(full_text)
    
    print(f"[DONE] Saved to {output_path}")

def main():
    parser = argparse.ArgumentParser(description="Apatheia PDF OCR Processor (Gemini)")
    parser.add_argument("--input", "-i", required=True, help="Input directory or file")
    parser.add_argument("--output", "-o", required=True, help="Output directory")
    parser.add_argument("--recursive", "-r", action="store_true", help="Recursively scan subdirectories")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    if input_path.is_file():
        if input_path.suffix.lower() == ".pdf":
            process_pdf(input_path, output_dir)
    elif input_path.is_dir():
        # Use recursive glob if --recursive flag set
        pattern = "**/*.pdf" if args.recursive else "*.pdf"
        pdfs = list(input_path.glob(pattern))

        # Skip portfolio PDFs (large files with only 1 page indicator in name)
        pdfs = [p for p in pdfs if "portfolio" not in p.name.lower()]

        print(f"[SCAN] Found {len(pdfs)} PDFs in {input_path} (recursive={args.recursive})")

        for pdf in pdfs:
            # Preserve relative path structure in output
            if args.recursive:
                rel_path = pdf.relative_to(input_path)
                pdf_output_dir = output_dir / rel_path.parent
                pdf_output_dir.mkdir(parents=True, exist_ok=True)
            else:
                pdf_output_dir = output_dir

            process_pdf(pdf, pdf_output_dir)
    else:
        print("[ERROR] Invalid input path")

if __name__ == "__main__":
    main()
