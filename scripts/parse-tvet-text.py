# TVET Document Parser - Text-based extraction
# Parses the raw text extracted from TVET PDF
# Usage: python scripts/parse-tvet-text.py

import re
import json

INPUT_PATH = "scripts/data/tvet_raw_text.txt"
OUTPUT_PATH = "scripts/data/tvet_parsed.json"

def clean_grade(grade_str):
    """Normalize grade format"""
    if not grade_str:
        return ""
    grade = grade_str.strip()
    # Normalize grade formats
    grade = re.sub(r'\s*\(plain\)', '', grade, flags=re.IGNORECASE)
    grade = re.sub(r'\s*plain', '', grade, flags=re.IGNORECASE)
    grade = re.sub(r'\s*\(minus\)', '-', grade, flags=re.IGNORECASE)
    grade = re.sub(r'\s*\(plus\)', '+', grade, flags=re.IGNORECASE)
    grade = grade.replace('C plain', 'C').replace('D plain', 'D')
    return grade.strip()

def parse_requirements(text_lines):
    """Parse requirement lines into structured list"""
    requirements = []
    
    for line in text_lines:
        line = line.strip()
        if not line:
            continue
            
        # Skip section headers
        if 'Science Based Courses' in line or 'Non-Science Based Courses' in line:
            continue
        if 'teaching subjects' in line.lower():
            continue
        if line.startswith('Alternative'):
            continue
            
        # Match patterns like "ENG/KIS - C+" or "MATH - C (plain)"
        # Also handle "BIO - C (plain)"
        match = re.match(r'^([A-Z][A-Z0-9/\s]*(?:Alternative\s*[A-Z])?)\s*[-–]\s*(.+)$', line, re.IGNORECASE)
        if match:
            subject = match.group(1).strip()
            grade = clean_grade(match.group(2))
            if subject and grade:
                requirements.append({
                    "subject": subject,
                    "grade": grade
                })
    
    return requirements

def parse_tvet_document():
    """Parse the TVET document text into structured data"""
    print("TVET TEXT PARSER")
    print("=" * 50)
    
    # Read the raw text
    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"Read {len(content)} characters")
    
    programs = []
    current_category = None
    current_exam_type = "KUCCPS"  # Default exam type
    
    lines = content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip empty lines and headers
        if not line or 'Copyright' in line or 'Page ' in line:
            i += 1
            continue
            
        # Detect exam type changes
        if 'KNEC EXAMINATION' in line:
            current_exam_type = "KNEC"
            i += 1
            continue
        if 'INTERNAL EXAMINERS' in line:
            current_exam_type = "INTERNAL"
            i += 1
            continue
            
        # Skip page markers and column headers
        if line.startswith('=== PAGE'):
            i += 1
            continue
        if 'Programme' in line and 'Category' in line:
            i += 1
            continue
        if line == 'Category' or 'Mean Grade' in line:
            i += 1
            continue
            
        # Match numbered category lines like "1 Law Diploma C plain ENG/KIS - C+"
        # Pattern: number category level grade requirements
        numbered_match = re.match(r'^(\d+)\s+(.+?)\s+(Diploma|Certificate|Artisan)\s+(.+?)(?:\s+([A-Z][A-Z0-9/\s]*\s*-\s*.+))?$', line, re.IGNORECASE)
        
        if numbered_match:
            num = numbered_match.group(1)
            category = numbered_match.group(2).strip()
            level = numbered_match.group(3).strip()
            grade_part = numbered_match.group(4).strip()
            req_part = numbered_match.group(5) if numbered_match.group(5) else ""
            
            current_category = category
            
            # Clean up the mean grade
            mean_grade = clean_grade(grade_part.split(' ')[0] if ' ' in grade_part else grade_part)
            
            # Collect requirements from this line and following lines
            req_lines = []
            if req_part:
                req_lines.append(req_part)
            
            # Look ahead for requirement continuation lines
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                if not next_line or next_line.startswith('==='):
                    break
                # Check if it's a new entry (starts with number or level)
                if re.match(r'^\d+\s+', next_line) or next_line.startswith('Diploma') or next_line.startswith('Certificate'):
                    break
                # Check if it's a requirement line
                if re.match(r'^[A-Z][A-Z0-9/\s]*\s*[-–]\s*', next_line):
                    req_lines.append(next_line)
                    j += 1
                elif 'Science Based' in next_line or 'teaching subjects' in next_line.lower():
                    j += 1
                else:
                    break
            
            requirements = parse_requirements(req_lines)
            
            program = {
                "category": current_category,
                "level": level,
                "min_mean_grade": mean_grade,
                "requirements": requirements,
                "exam_type": current_exam_type
            }
            programs.append(program)
            print(f"  Found: {category} - {level} ({mean_grade})")
            
            i = j
            continue
        
        # Match continuation lines for same category (different level)
        # e.g., "Certificate C- (minus) ENG/KIS - C(plain)"
        level_match = re.match(r'^(Diploma|Certificate|Artisan)(?:\s+for)?(?:\s+.+)?\s+([A-Z][+-]?\s*(?:\((?:plain|minus|plus)\))?)', line, re.IGNORECASE)
        
        if level_match and current_category:
            level = level_match.group(1).strip()
            grade_part = level_match.group(2).strip()
            mean_grade = clean_grade(grade_part)
            
            # Collect requirements
            req_lines = []
            # Check if requirements are on same line
            rest_of_line = line[level_match.end():].strip()
            if rest_of_line and '-' in rest_of_line:
                req_lines.append(rest_of_line)
            
            # Look ahead for requirement lines
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                if not next_line or next_line.startswith('==='):
                    break
                if re.match(r'^\d+\s+', next_line) or next_line.startswith('Diploma') or next_line.startswith('Certificate'):
                    break
                if re.match(r'^[A-Z][A-Z0-9/\s]*\s*[-–]\s*', next_line):
                    req_lines.append(next_line)
                    j += 1
                else:
                    break
            
            requirements = parse_requirements(req_lines)
            
            program = {
                "category": current_category,
                "level": level,
                "min_mean_grade": mean_grade,
                "requirements": requirements,
                "exam_type": current_exam_type
            }
            programs.append(program)
            print(f"  Found: {current_category} - {level} ({mean_grade})")
            
            i = j
            continue
        
        # Check for category name on its own line (for multi-line entries)
        if re.match(r'^[A-Za-z][A-Za-z\s&]+$', line) and not line.startswith('ENG') and not line.startswith('MATH'):
            possible_category = line.strip()
            if len(possible_category) > 3 and possible_category not in ['Diploma', 'Certificate', 'Artisan', 'None']:
                current_category = possible_category
        
        i += 1
    
    # Remove duplicates based on category+level+grade
    unique_programs = []
    seen = set()
    for p in programs:
        key = f"{p['category']}|{p['level']}|{p['min_mean_grade']}|{p['exam_type']}"
        if key not in seen:
            seen.add(key)
            unique_programs.append(p)
    
    print(f"\n{'=' * 50}")
    print(f"Parsed {len(unique_programs)} unique programs")
    
    # Save results
    output = {
        "source": "TVET_CLUSTER_DOCUMENT_2025.pdf",
        "extraction_method": "text_parsing",
        "total_programs": len(unique_programs),
        "programs": unique_programs
    }
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"Saved to: {OUTPUT_PATH}")
    
    # Show samples
    print("\nSample programs:")
    for p in unique_programs[:8]:
        print(f"  [{p['exam_type']}] {p['category']} ({p['level']}): {p['min_mean_grade']}")
        for r in p.get('requirements', [])[:2]:
            print(f"    - {r['subject']}: {r['grade']}")
    
    return unique_programs

if __name__ == "__main__":
    parse_tvet_document()
