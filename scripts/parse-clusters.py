# Parse KUCCPS Degree Cluster Document
# Extracts cluster definitions and maps programs to clusters
# Usage: python scripts/parse-clusters.py "path/to/cluster.pdf"

import sys
import json
import re
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("pdfplumber not installed. Run: pip install pdfplumber")
    sys.exit(1)

def extract_cluster_data(pdf_path):
    """Extract cluster definitions and program mappings from PDF"""
    print(f"Reading PDF: {pdf_path}")
    
    clusters = []
    current_cluster = None
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total pages: {len(pdf.pages)}")
        
        for page_num, page in enumerate(pdf.pages, 1):
            # Extract tables for subject requirements
            tables = page.extract_tables()
            
            # Also extract text for program names
            text = page.extract_text() or ""
            
            if tables:
                for table in tables:
                    for row in table:
                        if not row or len(row) < 2:
                            continue
                        
                        first_col = str(row[0] or "").strip()
                        
                        # Detect cluster header (e.g., "1", "2", "2A", "4A", "4B")
                        cluster_match = re.match(r'^(\d+[A-Z]?)$', first_col)
                        
                        if cluster_match:
                            # Save previous cluster
                            if current_cluster:
                                clusters.append(current_cluster)
                            
                            # Start new cluster
                            cluster_id = cluster_match.group(1)
                            current_cluster = {
                                "cluster_id": cluster_id,
                                "subject_1": "",
                                "subject_2": "",
                                "subject_3": "",
                                "subject_4": "",
                                "programs": []
                            }
                            
                            # Parse subject requirements from row
                            if len(row) >= 2:
                                current_cluster["subject_1"] = str(row[1] or "").strip().replace("\n", " ")
                            if len(row) >= 3:
                                current_cluster["subject_2"] = str(row[2] or "").strip().replace("\n", " ")
                            if len(row) >= 4:
                                current_cluster["subject_3"] = str(row[3] or "").strip().replace("\n", " ")
                            if len(row) >= 5:
                                current_cluster["subject_4"] = str(row[4] or "").strip().replace("\n", " ")
                        
                        # Detect program names (Bachelor of..., B.Sc..., etc.)
                        elif current_cluster and first_col:
                            # Check if this looks like a program name
                            if re.match(r'^(Bachelor|B\.|BACHELOR)', first_col, re.IGNORECASE):
                                program_name = first_col.replace("\n", " ").strip()
                                if program_name and program_name not in current_cluster["programs"]:
                                    current_cluster["programs"].append(program_name)
                            
                            # Also check other columns for program names
                            for col in row[1:]:
                                if col:
                                    col_text = str(col).strip()
                                    if re.match(r'^(Bachelor|B\.|BACHELOR)', col_text, re.IGNORECASE):
                                        program_name = col_text.replace("\n", " ").strip()
                                        if program_name and program_name not in current_cluster["programs"]:
                                            current_cluster["programs"].append(program_name)
            
            if page_num % 10 == 0:
                print(f"   Processed {page_num}/{len(pdf.pages)} pages...")
    
    # Don't forget the last cluster
    if current_cluster:
        clusters.append(current_cluster)
    
    print(f"Extracted {len(clusters)} clusters")
    return clusters

def clean_clusters(clusters):
    """Clean and deduplicate cluster data"""
    cleaned = []
    seen_ids = set()
    
    for cluster in clusters:
        cid = cluster["cluster_id"]
        
        if cid in seen_ids:
            # Merge programs into existing cluster
            for c in cleaned:
                if c["cluster_id"] == cid:
                    for prog in cluster["programs"]:
                        if prog not in c["programs"]:
                            c["programs"].append(prog)
                    break
        else:
            seen_ids.add(cid)
            cleaned.append(cluster)
    
    return cleaned

def save_clusters(clusters, pdf_filename):
    """Save extracted clusters to JSON"""
    output_dir = Path("scripts/data")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / "extracted_clusters.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "source_file": pdf_filename,
            "total_clusters": len(clusters),
            "clusters": clusters
        }, f, indent=2, ensure_ascii=False)
    
    print(f"Saved to: {output_file}")
    return str(output_file)

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/parse-clusters.py <path-to-cluster-pdf>")
        print("\nExample:")
        print('  python scripts/parse-clusters.py "Kuccps Files/DEGREE_CLUSTER_DOCUMENT_2025_03 (1).pdf"')
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    if not Path(pdf_path).exists():
        print(f"File not found: {pdf_path}")
        sys.exit(1)
    
    print("KUCCPS Cluster Document Parser")
    print("="*40)
    
    try:
        clusters = extract_cluster_data(pdf_path)
        
        if not clusters:
            print("\nNo clusters extracted. Trying alternative parsing...")
        
        # Clean and deduplicate
        clusters = clean_clusters(clusters)
        
        save_clusters(clusters, pdf_path)
        
        # Summary
        print("\nSummary:")
        print(f"  Total clusters: {len(clusters)}")
        
        total_programs = sum(len(c["programs"]) for c in clusters)
        print(f"  Total program mappings: {total_programs}")
        
        # Show first few clusters
        print("\nSample clusters:")
        for cluster in clusters[:5]:
            print(f"\n  Cluster {cluster['cluster_id']}:")
            print(f"    Subject 1: {cluster['subject_1'][:50]}..." if len(cluster['subject_1']) > 50 else f"    Subject 1: {cluster['subject_1']}")
            print(f"    Programs: {len(cluster['programs'])}")
        
        print("\nDone!")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
