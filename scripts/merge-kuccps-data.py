# Merge KUCCPS data from multiple extracted JSON files
# Usage: python scripts/merge-kuccps-data.py

import json
from pathlib import Path

def load_json(filepath):
    """Load JSON file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def merge_program_data(base_program, additional_data):
    """Merge additional data into base program"""
    merged = base_program.copy()
    
    # Add/update cutoff years
    for key in additional_data:
        if key.startswith('cutoff_') and additional_data[key]:
            # If base doesn't have this cutoff, or additional has a value
            if not merged.get(key) or additional_data[key]:
                merged[key] = additional_data[key]
    
    # Keep subject requirements from base if they exist
    for key in ['subject_1', 'subject_2', 'subject_3', 'subject_4']:
        if key not in merged:
            merged[key] = ""
    
    return merged

def main():
    print("KUCCPS Data Merger")
    print("="*50)
    
    data_dir = Path("scripts/data")
    
    # Load main programs file
    main_file = data_dir / "extracted_DEGREE_PROGRAMMES_2025.json"
    if not main_file.exists():
        print(f"Error: Main file not found: {main_file}")
        return
    
    print(f"\nLoading main file: {main_file.name}")
    main_data = load_json(main_file)
    programs_by_code = {p['program_code']: p for p in main_data['programs']}
    print(f"  Programs: {len(programs_by_code)}")
    
    # Load cutoffs file if exists
    cutoffs_file = data_dir / "extracted_DEGREE_CUTOFFS_14-07-2025.json"
    if cutoffs_file.exists():
        print(f"\nLoading cutoffs file: {cutoffs_file.name}")
        cutoffs_data = load_json(cutoffs_file)
        print(f"  Programs with cutoffs: {cutoffs_data['total_programs']}")
        
        # Merge cutoffs into main data
        updated = 0
        added = 0
        
        for prog in cutoffs_data['programs']:
            code = prog['program_code']
            
            if code in programs_by_code:
                # Update existing program with additional cutoffs
                programs_by_code[code] = merge_program_data(programs_by_code[code], prog)
                updated += 1
            else:
                # Add new program (with empty subject requirements)
                new_prog = {
                    "row_number": prog.get('row_number', ''),
                    "program_code": code,
                    "institution": prog.get('institution', ''),
                    "program": prog.get('program', ''),
                    "cutoff_2023": prog.get('cutoff_2023', ''),
                    "cutoff_2022": prog.get('cutoff_2022', ''),
                    "cutoff_2021": prog.get('cutoff_2021', ''),
                    "cutoff_2020": prog.get('cutoff_2020', ''),
                    "cutoff_2019": prog.get('cutoff_2019', ''),
                    "cutoff_2018": prog.get('cutoff_2018', ''),
                    "cutoff_2024": prog.get('cutoff_2024', ''),
                    "subject_1": "",
                    "subject_2": "",
                    "subject_3": "",
                    "subject_4": ""
                }
                programs_by_code[code] = new_prog
                added += 1
        
        print(f"  Updated: {updated}")
        print(f"  Added new: {added}")
    else:
        print(f"\nCutoffs file not found: {cutoffs_file}")
        print("Run: python scripts/parse-cutoffs.py \"Kuccps Files/DEGREE_CUTOFFS_14-07-2025.pdf\"")
    
    # Save merged data
    merged_programs = list(programs_by_code.values())
    
    output_file = data_dir / "merged_kuccps_data.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "source_files": [
                "DEGREE_PROGRAMMES_2025.pdf",
                "DEGREE_CUTOFFS_14-07-2025.pdf"
            ],
            "total_programs": len(merged_programs),
            "programs": merged_programs
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\nMerged data saved to: {output_file}")
    print(f"Total programs: {len(merged_programs)}")
    
    # Show sample of merged data
    print("\nSample merged record:")
    sample = merged_programs[0]
    for key, val in sample.items():
        if val:
            print(f"  {key}: {val}")

if __name__ == "__main__":
    main()
