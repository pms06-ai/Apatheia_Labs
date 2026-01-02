
import pdfplumber

INPUT_FILE = r"C:\Users\pstep\OneDrive\Desktop\5 - Review of VKS_2 - Joshua DUNMORE phone 1st SRU2.pdf"

def inspect_with_plumber():
    try:
        with pdfplumber.open(INPUT_FILE) as pdf:
            page = pdf.pages[0]
            text = page.extract_text()
            print("--- TEXT ---")
            print(text)
            print("--- END TEXT ---")
            
            # Print first 5 words with coords
            print("\n--- WORDS ---")
            for word in page.extract_words()[:5]:
                print(word)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_with_plumber()
