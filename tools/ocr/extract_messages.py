
import pypdf
import sys
import os

# Configuration
FILES_TO_PROCESS = [
    {
        "input": r"C:\Users\pstep\OneDrive\Documents\Desktop\Messages - Joshua Dunmore.pdf",
        "output": r"C:\Users\pstep\OneDrive\Documents\Desktop\Messages - Joshua Dunmore.md"
    },
    {
        "input": r"C:\Users\pstep\OneDrive\Documents\Desktop\Messages - Paul Stephen.pdf",
        "output": r"C:\Users\pstep\OneDrive\Documents\Desktop\Messages - Paul Stephen.md"
    },
    {
        "input": r"C:\Users\pstep\OneDrive\Documents\Desktop\Messages - Stephen Alderton.pdf",
        "output": r"C:\Users\pstep\OneDrive\Documents\Desktop\Messages - Stephen Alderton.md"
    }
]

def process_pdf_fast(file_config):
    input_path = file_config["input"]
    output_path = file_config["output"]
    
    print(f"Processing {input_path} (Fast Mode)...")
    
    if not os.path.exists(input_path):
        print(f"File not found: {input_path}")
        return

    markdown_lines = []
    
    try:
        reader = pypdf.PdfReader(input_path)
        total_pages = len(reader.pages)
        print(f"Total pages: {total_pages}")
        
        for i, page in enumerate(reader.pages):
            if i % 100 == 0:
                print(f"Processing page {i+1}/{total_pages}...")
            
            # Store extracted text pieces: (y, x, text)
            # Note: PDF Y coordinates usually go from bottom to top, so higher Y is higher on page.
            # We will sort by Y descending (top to bottom).
            page_content = []
            
            def visitor_body(text, cm, tm, fontDict, fontSize):
                x = tm[4]
                y = tm[5]
                if text and text.strip():
                    page_content.append((y, x, text))

            page.extract_text(visitor_text=visitor_body)
            
            # Group by line (Y coordinate)
            # We use a small tolerance for Y to group words on same line
            lines = []
            if not page_content:
                continue
                
            # Sort by Y descending first to process top actions
            sorted_content = sorted(page_content, key=lambda item: -item[0]) # Descending Y
            
            current_line = []
            current_y = sorted_content[0][0]
            
            for y, x, text in sorted_content:
                if abs(y - current_y) < 5: # 5 unit tolerance
                    current_line.append((x, text))
                else:
                    # Flush current line
                    lines.append(current_line)
                    current_line = [(x, text)]
                    current_y = y
            lines.append(current_line) # Flush last line
            
            # Process lines
            for line_items in lines:
                if not line_items: continue
                # Sort items in line by X ascending
                line_items.sort(key=lambda item: item[0])
                
                # Full line text and min X
                min_x = line_items[0][0]
                text = "".join(item[1] for item in line_items).strip()
                
                # FILTERS
                if not text: continue
                if "Page" in text and "of" in text and min_x > 400: continue
                if text == "iMessage": continue
                if "DigiDNA" in text or "iMazing" in text: continue
                if "Database date when" in text: continue
                if "extracted:" in text: continue
                if text.strip().startswith("Messages - "): continue
                
                # CLASSIFICATION
                is_right = False
                if min_x > 200: # Heuristic threshold
                    is_right = True
                
                start_tag = '<div style="text-align: right; margin: 5px; color: #0066cc;">' if is_right else '<div style="text-align: left; margin: 5px; color: #333;">'
                end_tag = '</div>'
                
                formatted_line = f"{start_tag}{text}{end_tag}"
                markdown_lines.append(formatted_line)
                    
    except Exception as e:
        print(f"Error processing {input_path}: {e}")
        return

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(markdown_lines))
    print(f"Written to {output_path}")

if __name__ == "__main__":
    for config in FILES_TO_PROCESS:
        process_pdf_fast(config)
