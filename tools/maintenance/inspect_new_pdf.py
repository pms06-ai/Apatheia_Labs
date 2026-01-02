
import pypdf

INPUT_FILE = r"C:\Users\pstep\OneDrive\Desktop\5 - Review of VKS_2 - Joshua DUNMORE phone 1st SRU2.pdf"

def inspect_pdf_structure():
    try:
        reader = pypdf.PdfReader(INPUT_FILE)
        
        for i in range(min(5, len(reader.pages))):
            print(f"\n--- Page {i} ---")
            page = reader.pages[i]
            
            def visitor_body(text, cm, tm, fontDict, fontSize):
                x = tm[4]
                y = tm[5]
                if text and text.strip():
                    print(f"X={x:.2f}, Y={y:.2f}: '{text}'")

            page.extract_text(visitor_text=visitor_body)
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_pdf_structure()
