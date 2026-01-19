# TVET Cluster Document Parser - PDF Table Extraction
# Uses pdfplumber to extract tables directly from PDF
# Usage: python scripts/parse-tvet-pdf.py

import pdfplumber
import json
import re

PDF_PATH = "Kuccps Files/TVET_CLUSTER_DOCUMENT_2025.pdf"
OUTPUT_PATH = "scripts/data/tvet_pdf_parsed.json"

def clean_grade(grade_str):
    """Normalize grade format"""
    if not grade_str:
        return ""
    grade = grade_str.strip()
    # Normalize grade formats
    grade = re.sub(r'\s*\(plain\)', '', grade, flags=re.IGNORECASE)
    grade = re.sub(r'\s*\(minus\)', '-', grade, flags=re.IGNORECASE)
    grade = grade.replace('C plain', 'C').replace('D plain', 'D')
    return grade.strip()

def parse_requirements(req_text):
    """Parse subject requirements string into structured list"""
    if not req_text or req_text.strip().lower() == 'none':
        return []
    
    requirements = []
    # Split by newlines or common patterns
    lines = req_text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line or line.lower() in ['science based courses', 'non-science based courses', 'none']:
            continue
        
        # Match patterns like "ENG/KIS - C+" or "MATH - C (plain)"
        match = re.match(r'([A-Z/\s]+(?:Alternative\s*[A-Z])?)\s*[-–]\s*(.+)', line, re.IGNORECASE)
        if match:
            subject = match.group(1).strip()
            grade = clean_grade(match.group(2))
            requirements.append({
                "subject": subject,
                "grade": grade
            })
        elif 'C+' in line or 'C-' in line or 'C ' in line or 'D' in line:
            # Try to parse inline format
            parts = re.split(r'\s+-\s+', line)
            if len(parts) == 2:
                requirements.append({
                    "subject": parts[0].strip(),
                    "grade": clean_grade(parts[1])
                })
    
    return requirements

def extract_tvet_data():
    """Extract TVET program data from PDF"""
    print("TVET PDF PARSER")
    print("=" * 50)
    
    programs = []
    current_category = None
    
    with pdfplumber.open(PDF_PATH) as pdf:
        print(f"Opened PDF: {PDF_PATH}")
        print(f"Total pages: {len(pdf.pages)}")
        
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"\n  Processing page {page_num}...")
            
            # Extract tables from page
            tables = page.extract_tables()
            
            for table in tables:
                if not table:
                    continue
                    
                for row in table:
                    if not row or len(row) < 3:
                        continue
                    
                    # Skip header rows
                    if row[0] and 'Programme' in str(row[0]):
                        continue
                    if row[0] and 'Category' in str(row[0]):
                        continue
                    
                    # Parse row data
                    category = str(row[0]).strip() if row[0] else None
                    level = str(row[1]).strip() if len(row) > 1 and row[1] else None
                    min_grade = str(row[2]).strip() if len(row) > 2 and row[2] else None
                    requirements = str(row[3]).strip() if len(row) > 3 and row[3] else None
                    
                    # Update current category if provided
                    if category and category not in ['', 'None']:
                        current_category = category
                    
                    # Skip empty rows
                    if not level and not min_grade:
                        continue
                    
                    # Handle numbered categories (1, 2, 3, etc.)
                    if category and category.isdigit():
                        current_category = None  # Will be filled from next column data
                    
                    # Parse requirements
                    parsed_reqs = parse_requirements(requirements)
                    
                    # Determine if this is science or non-science based
                    notes = ""
                    if requirements:
                        if 'science based' in requirements.lower():
                            notes = "Science Based Courses" if 'non' not in requirements.lower() else "Non-Science Based Courses"
                    
                    program = {
                        "category": current_category or "",
                        "level": level,
                        "min_mean_grade": clean_grade(min_grade),
                        "requirements": parsed_reqs,
                        "notes": notes
                    }
                    
                    # Only add if we have some valid data
                    if level or parsed_reqs:
                        programs.append(program)
                        print(f"    Found: {current_category} - {level}")
    
    # Deduplicate and clean
    unique_programs = []
    seen = set()
    for p in programs:
        key = f"{p['category']}|{p['level']}|{p['min_mean_grade']}"
        if key not in seen and p['category']:
            seen.add(key)
            unique_programs.append(p)
    
    print(f"\n{'=' * 50}")
    print(f"Extracted {len(unique_programs)} unique programs")
    
    # Save results
    output = {
        "source": PDF_PATH,
        "extraction_method": "pdfplumber",
        "total_programs": len(unique_programs),
        "programs": unique_programs
    }
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"Saved to: {OUTPUT_PATH}")
    
    # Show sample
    print("\nSample programs:")
    for p in unique_programs[:5]:
        print(f"  {p['category']} ({p['level']}): {p['min_mean_grade']}")
        for r in p['requirements'][:3]:
            print(f"    - {r['subject']}: {r['grade']}")
    
    return unique_programs

if __name__ == "__main__":
    extract_tvet_data()
