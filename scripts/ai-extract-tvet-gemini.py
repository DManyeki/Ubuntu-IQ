# TVET Excel - Gemini Pro Extraction via Python
# Usage: python scripts/ai-extract-tvet-gemini.py

import json
import openpyxl
import requests

GEMINI_API_KEY = 'AIzaSyCddAccV5IzmxufwnQllaWsKI93yLOmZ3I'
EXCEL_PATH = 'Kuccps Files/TVET_CLUSTER_DOCUMENT_2025 - updated.xlsx'
OUTPUT_PATH = 'scripts/data/tvet_gemini_extracted.json'

def extract_excel_content():
    """Extract Excel content as structured text"""
    print("Extracting Excel content...")
    
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb.active
    
    lines = []
    lines.append("TVET CLUSTER REQUIREMENTS TABLE")
    lines.append("=" * 60)
    lines.append("")
    lines.append("Columns: Number | Category | Level | Mean Grade | Subject Requirements")
    lines.append("")
    
    for row_idx in range(1, ws.max_row + 1):
        row_data = []
        for col_idx in range(1, 6):
            cell = ws.cell(row=row_idx, column=col_idx)
            val = str(cell.value).replace('\n', ' ').strip() if cell.value else ""
            row_data.append(val)
        if any(row_data):
            lines.append(" | ".join(row_data))
    
    content = "\n".join(lines)
    
    # Save for debugging
    with open('scripts/data/tvet_excel_content.txt', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Extracted {len(content)} characters")
    return content

def call_gemini(content):
    """Call Gemini API"""
    print("\nCalling Gemini API...")
    
    prompt = f"""You are an expert data extraction assistant. Parse this KUCCPS TVET programmes table and extract ALL programs into a clean JSON format.

TABLE DATA:
{content}

TASK:
Extract each program entry with these fields:
1. "category": The programme category name (e.g., "Law", "Education", "Architecture")
2. "level": "Diploma", "Certificate", or "Artisan"
3. "min_mean_grade": Minimum KCSE mean grade required. Clean format:
   - "C plain" or "C (plain)" → "C"
   - "C- (minus)" → "C-"
   - "D (plain)" → "D"
4. "requirements": Array of subject-grade pairs. Each entry has:
   - "subject": Subject code (e.g., "ENG/KIS", "MATH Alternative A", "BIO")
   - "grade": Minimum grade (e.g., "C+", "C", "C-", "D+")
5. "exam_type": Determine from context:
   - "KUCCPS" for most programmes
   - "KNEC" after "KNEC EXAMINATION" marker
   - "INTERNAL" after "INTERNAL EXAMINERS" marker

IMPORTANT RULES:
- If requirements say "None", use empty array []
- Parse multi-line requirements correctly
- Clean category names (remove newlines)
- Most KNEC programmes have "None" for requirements

Return ONLY a valid JSON array:"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    
    headers = {"Content-Type": "application/json"}
    
    data = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 8192
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=120)
        
        if response.status_code != 200:
            print(f"API Error: {response.status_code}")
            print(response.text)
            return []
        
        result = response.json()
        text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
        
        # Save raw response
        with open('scripts/data/tvet_gemini_response.txt', 'w', encoding='utf-8') as f:
            f.write(text)
        
        # Extract JSON
        import re
        json_match = re.search(r'\[[\s\S]*\]', text)
        if json_match:
            programs = json.loads(json_match.group(0))
            print(f"Gemini extracted {len(programs)} programs")
            return programs
        
        print("No JSON found in response")
        return []
        
    except Exception as e:
        print(f"Error: {e}")
        return []

def main():
    print("TVET EXTRACTION WITH GEMINI")
    print("=" * 50)
    
    # Extract content
    content = extract_excel_content()
    
    # Call Gemini
    programs = call_gemini(content)
    
    if not programs:
        print("\nNo programs extracted. Check scripts/data/tvet_gemini_response.txt")
        return
    
    # Deduplicate
    unique = {}
    for p in programs:
        if p.get('category'):
            key = f"{p['category']}|{p.get('level', '')}|{p.get('exam_type', '')}"
            if key not in unique or len(p.get('requirements', [])) > len(unique[key].get('requirements', [])):
                unique[key] = p
    
    final = list(unique.values())
    
    # Save
    output = {
        "source": EXCEL_PATH,
        "extraction_method": "gemini_pro",
        "total_programs": len(final),
        "programs": final
    }
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved {len(final)} programs to: {OUTPUT_PATH}")
    
    # Summary
    print("\n" + "=" * 50)
    print("SUMMARY BY EXAM TYPE:")
    for t in ['KUCCPS', 'KNEC', 'INTERNAL']:
        count = len([p for p in final if p.get('exam_type') == t])
        print(f"  {t}: {count}")
    
    print("\nSAMPLE PROGRAMS:")
    for p in final[:8]:
        reqs = p.get('requirements', [])
        print(f"  {p.get('category', '?')} ({p.get('level', '?')}): {p.get('min_mean_grade', '?')} [{p.get('exam_type', '?')}]")
        for r in reqs[:2]:
            print(f"    - {r.get('subject', '?')}: {r.get('grade', '?')}")

if __name__ == "__main__":
    main()
