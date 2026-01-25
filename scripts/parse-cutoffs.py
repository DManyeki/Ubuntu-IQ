# Parse KUCCPS Degree Cutoffs PDF (2018-2024 data)
# Usage: python scripts/parse-cutoffs.py "path/to/cutoffs.pdf"

import sys
import json
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("pdfplumber not installed. Run: pip install pdfplumber")
    sys.exit(1)

def extract_cutoffs_from_pdf(pdf_path):
    """Extract cutoff data from DEGREE CUTOFFS PDF"""
    print(f"Reading PDF: {pdf_path}")
    
    all_programs = []
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total pages: {len(pdf.pages)}")
        
        for page_num, page in enumerate(pdf.pages, 1):
            tables = page.extract_tables()
            
            if tables:
                print(f"   Page {page_num}: Found {len(tables)} table(s)")
                
                for table in tables:
                    for row in table:
                        if not row or len(row) < 4:
                            continue
                        
                        # Skip header rows
                        first_col = str(row[0] or "").strip()
                        if first_col in ["#", "", "PROG", "CODE"] or not first_col.isdigit():
                            continue
                        
                        # Helper to safely get column value
                        def get_col(idx, default=""):
                            if idx < len(row) and row[idx]:
                                val = str(row[idx]).strip().replace("\n", " ")
                                return val if val != "-" else ""
                            return default
                        
                        # CUTOFFS format:
                        # # | PROG CODE | INSTITUTION | PROGRAMME | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024
                        try:
                            program_data = {
                                "row_number": first_col,
                                "program_code": get_col(1),
                                "institution": get_col(2),
                                "program": get_col(3),
                                "cutoff_2018": get_col(4),
                                "cutoff_2019": get_col(5),
                                "cutoff_2020": get_col(6),
                                "cutoff_2021": get_col(7),
                                "cutoff_2022": get_col(8),
                                "cutoff_2023": get_col(9),
                                "cutoff_2024": get_col(10)
                            }
                            
                            if program_data["institution"] and program_data["program"] and program_data["program_code"]:
                                all_programs.append(program_data)
                        except Exception as e:
                            print(f"   Error: {e}")
                            continue
            
            if page_num % 5 == 0:
                print(f"   Processed {page_num}/{len(pdf.pages)} pages...")
    
    print(f"Extracted {len(all_programs)} programs with cutoff data")
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
    
    print(f"Saved to: {output_file}")
    return str(output_file)

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/parse-cutoffs.py <path-to-cutoffs-pdf>")
        print("\nExample:")
        print('  python scripts/parse-cutoffs.py "Kuccps Files/DEGREE_CUTOFFS_14-07-2025.pdf"')
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    if not Path(pdf_path).exists():
        print(f"File not found: {pdf_path}")
        sys.exit(1)
    
    print("KUCCPS Degree Cutoffs Parser")
    print("="*40)
    
    try:
        programs = extract_cutoffs_from_pdf(pdf_path)
        
        if not programs:
            print("\nNo data extracted.")
            sys.exit(1)
        
        save_to_json(programs, pdf_path)
        
        # Summary
        print("\nSummary:")
        print(f"  Total programs: {len(programs)}")
        print(f"  Unique institutions: {len(set(p['institution'] for p in programs))}")
        
        # Show years with data
        years = ['2018', '2019', '2020', '2021', '2022', '2023', '2024']
        for year in years:
            count = sum(1 for p in programs if p.get(f'cutoff_{year}'))
            print(f"  Programs with {year} cutoff: {count}")
        
        print("\nDone!")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
