# KUCCPS PDF Table Parser (Python)
# Usage: python scripts/parse-kuccps-pdf.py "path/to/pdf"

import sys
import json
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("pdfplumber not installed. Please run: pip install pdfplumber")
    sys.exit(1)

def extract_tables_from_pdf(pdf_path):
    """Extract all tables from PDF with full column data"""
    print(f"Reading PDF: {pdf_path}")
    
    all_programs = []
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total pages: {len(pdf.pages)}")
        
        for page_num, page in enumerate(pdf.pages, 1):
            # Extract tables from page
            tables = page.extract_tables()
            
            if tables:
                print(f"   Page {page_num}: Found {len(tables)} table(s)")
                
                for table in tables:
                    # Process each row
                    for row in table:
                        if not row or len(row) < 4:  # Need at least basic columns
                            continue
                        
                        # Skip header rows
                        first_col = str(row[0] or "").strip()
                        if first_col == "#" or first_col == "" or first_col == "PROG" or not first_col.isdigit():
                            continue
                        
                        # Full KUCCPS format (9 columns):
                        # # | PROG CODE | INSTITUTION NAME | PROGRAMME NAME | CUTOFF-2023 | CUTOFF-2022 | SUBJECT1 | SUBJECT2 | SUBJECT3 | SUBJECT4
                        # Note: First column (#) is row number, actual data starts at row[1]
                        
                        try:
                            # Helper to safely get column value
                            def get_col(idx, default=""):
                                if idx < len(row) and row[idx]:
                                    return str(row[idx]).strip().replace("\n", " ")
                                return default
                            
                            program_data = {
                                "row_number": first_col,
                                "program_code": get_col(1),
                                "institution": get_col(2),
                                "program": get_col(3),
                                "cutoff_2023": get_col(4),
                                "cutoff_2022": get_col(5),
                                "subject_1": get_col(6),
                                "subject_2": get_col(7),
                                "subject_3": get_col(8),
                                "subject_4": get_col(9)
                            }
                            
                            # Only add if we have meaningful data
                            if program_data["institution"] and program_data["program"] and program_data["program_code"]:
                                all_programs.append(program_data)
                        except Exception as e:
                            print(f"   Error on row: {e}")
                            continue
            
            if page_num % 10 == 0:
                print(f"   Processed {page_num}/{len(pdf.pages)} pages...")
    
    print(f"Extracted {len(all_programs)} programs")
    return all_programs

def save_to_json(programs, pdf_filename):
    """Save extracted data to JSON"""
    output_dir = Path("scripts/data")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / f"extracted_{Path(pdf_filename).stem}.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "source_file": pdf_filename,
            "total_programs": len(programs),
            "programs": programs
        }, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Saved to: {output_file}")
    return str(output_file)

def main():
    if len(sys.argv) < 2:
        print("❌ Usage: python scripts/parse-kuccps-pdf.py <path-to-pdf>")
        print("\nExample:")
        print('  python scripts/parse-kuccps-pdf.py "Kuccps Files/DEGREE_PROGRAMMES_2025.pdf"')
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    if not Path(pdf_path).exists():
        print(f"❌ File not found: {pdf_path}")
        sys.exit(1)
    
    print("🚀 KUCCPS PDF Table Parser\n")
    
    try:
        # Extract tables
        programs = extract_tables_from_pdf(pdf_path)
        
        if not programs:
            print("\n❌ No data extracted. Check PDF format.")
            sys.exit(1)
        
        # Save to JSON
        output_file = save_to_json(programs, pdf_path)
        
        # Show summary
        print("\n📊 Summary:")
        print(f"   Total programs: {len(programs)}")
        
        # Count by institution
        institutions = {}
        for prog in programs:
            inst = prog["institution"]
            institutions[inst] = institutions.get(inst, 0) + 1
        
        print(f"   Unique institutions: {len(institutions)}")
        
        print("\n   Top 5 institutions:")
        for inst, count in sorted(institutions.items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"     {inst}: {count} programs")
        
        print("\n✅ Done! Review the JSON file and then run:")
        print(f"   npx tsx scripts/import-to-supabase.ts {output_file}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
