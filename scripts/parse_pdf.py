import sys
import json
import pdfplumber

def parse_pdf(file_path):
    try:
        pages_content = []
        full_text = ""
        
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                # Extract text with layout analysis
                # x_tolerance and y_tolerance help with the spacing issues
                text = page.extract_text(x_tolerance=2, y_tolerance=3)
                if text:
                    # Basic cleaning
                    clean_text = text.strip()
                    pages_content.append(clean_text)
                    full_text += clean_text + "\n\n"
        
        result = {
            "pages": pages_content,
            "fullText": full_text,
            "metadata": pdf.metadata if pdf.metadata else {}
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        error = {"error": str(e)}
        print(json.dumps(error))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)
    
    parse_pdf(sys.argv[1])
