# Parse cluster text file using regex patterns
# Usage: python scripts/parse-cluster-text.py

import re
import json
from pathlib import Path

def parse_cluster_text():
    """Parse the extracted cluster text file"""
    print("CLUSTER TEXT PARSER")
    print("="*50)
    
    # Load raw text
    text_path = Path("scripts/data/cluster_raw_text.txt")
    text = text_path.read_text(encoding='utf-8')
    
    lines = text.split('\n')
    print(f"Loaded {len(lines)} lines")
    
    clusters = []
    current_cluster = None
    
    # Patterns
    # Main cluster: "4 Subject 1 Subject 2..."
    main_cluster_pattern = re.compile(r'^(\d+)\s+Subject 1\s+Subject 2')
    
    # Sub-cluster with requirements: "4A MAT ALTERNATIVE A - C+ PHY - C+..."
    sub_cluster_pattern = re.compile(r'^(\d+[A-Z])\s+(.+)')
    
    # Program pattern
    program_pattern = re.compile(r'^Bachelor of|^B\.|^BACHELOR', re.IGNORECASE)
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line or line.startswith('===') or line.startswith('DEGREE') or line.startswith('CLUSTER') or line.startswith('© Copyright'):
            continue
        
        # Check for main cluster header
        main_match = main_cluster_pattern.match(line)
        if main_match:
            cluster_id = main_match.group(1)
            # Extract subject requirements from this line and next
            req_text = line[len(main_match.group(0)):]
            
            # Save previous cluster
            if current_cluster:
                clusters.append(current_cluster)
            
            current_cluster = {
                "cluster_id": cluster_id,
                "is_main": True,
                "requirements_raw": req_text.strip(),
                "sub_clusters": [],
                "programs": []
            }
            continue
        
        # Check for sub-cluster (e.g., "4A", "5B")
        sub_match = sub_cluster_pattern.match(line)
        if sub_match:
            sub_id = sub_match.group(1)
            requirements = sub_match.group(2).strip()
            
            # Skip if it's actually a program name
            if program_pattern.match(requirements):
                # It's a program, not a sub-cluster
                if current_cluster:
                    prog_text = f"{sub_id} {requirements}"
                    current_cluster["programs"].append(prog_text)
                continue
            
            # Check if this is a numbered cluster followed by subject requirements
            if re.match(r'^\d+[A-Z]$', sub_id) and requirements:
                sub_cluster = {
                    "sub_id": sub_id,
                    "requirements": parse_requirements(requirements),
                    "requirements_raw": requirements,
                    "programs": []
                }
                
                if current_cluster:
                    current_cluster["sub_clusters"].append(sub_cluster)
                else:
                    # Standalone sub-cluster
                    parent_id = sub_id[:-1]  # e.g., "4" from "4A"
                    current_cluster = {
                        "cluster_id": parent_id,
                        "is_main": False,
                        "requirements_raw": "",
                        "sub_clusters": [sub_cluster],
                        "programs": []
                    }
                continue
        
        # Check for program names
        if program_pattern.match(line):
            prog_name = line.strip()
            
            # Add to current sub-cluster if exists, otherwise to main cluster
            if current_cluster:
                if current_cluster["sub_clusters"]:
                    current_cluster["sub_clusters"][-1]["programs"].append(prog_name)
                else:
                    current_cluster["programs"].append(prog_name)
    
    # Don't forget last cluster
    if current_cluster:
        clusters.append(current_cluster)
    
    print(f"Parsed {len(clusters)} main clusters")
    
    return clusters

def parse_requirements(req_string):
    """Parse requirement string into structured data"""
    # Pattern: "MAT ALTERNATIVE A - C+" or "PHY - C+" or "BIO/CHE - C (PLAIN)"
    parts = []
    
    # Split by common subject separators
    subjects = re.split(r'\s{2,}', req_string)
    
    for subj in subjects:
        subj = subj.strip()
        if not subj:
            continue
        
        # Try to extract subject and grade
        grade_match = re.search(r'-\s*([A-Z][+-]?)\s*(\(PLAIN\))?$', subj)
        if grade_match:
            grade = grade_match.group(1)
            if grade_match.group(2):
                grade += " (PLAIN)"
            subject = subj[:grade_match.start()].strip()
            parts.append({"subject": subject, "grade": grade})
        else:
            parts.append({"subject": subj, "grade": None})
    
    return parts

def flatten_clusters(clusters):
    """Flatten clusters for database upload"""
    flat = []
    
    for cluster in clusters:
        # Add sub-clusters
        for sub in cluster.get("sub_clusters", []):
            entry = {
                "cluster_id": sub["sub_id"],
                "parent_cluster": cluster["cluster_id"],
                "requirements": sub.get("requirements", []),
                "requirements_raw": sub.get("requirements_raw", ""),
                "programs": sub.get("programs", [])
            }
            flat.append(entry)
        
        # Add main cluster if it has programs directly
        if cluster.get("programs"):
            entry = {
                "cluster_id": cluster["cluster_id"],
                "parent_cluster": None,
                "requirements": [],
                "requirements_raw": cluster.get("requirements_raw", ""),
                "programs": cluster["programs"]
            }
            flat.append(entry)
    
    return flat

def main():
    clusters = parse_cluster_text()
    flat_clusters = flatten_clusters(clusters)
    
    # Save parsed data
    output_path = Path("scripts/data/parsed_clusters.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "total_clusters": len(flat_clusters),
            "clusters": flat_clusters
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved {len(flat_clusters)} clusters to: {output_path}")
    
    # Summary
    total_programs = sum(len(c["programs"]) for c in flat_clusters)
    print(f"Total program mappings: {total_programs}")
    
    # Show sample
    print("\nSample clusters:")
    for c in flat_clusters[:5]:
        print(f"\n  {c['cluster_id']}:")
        print(f"    Requirements: {c['requirements_raw'][:60]}...")
        print(f"    Programs: {len(c['programs'])}")
        if c['programs']:
            print(f"      - {c['programs'][0][:50]}...")
    
    print("\n" + "="*50)
    print("DONE")

if __name__ == "__main__":
    main()
