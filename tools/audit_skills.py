import os
import glob
import json
import yaml
import hashlib
import re
from pathlib import Path

SKILLS_DIR = r"C:\Users\Pranav\.gemini\config\skills"
PLUGINS_DIR = r"C:\Users\Pranav\.gemini\config\plugins"
WORKSPACE_AGENTS_DIR = r"c:\Users\Pranav\Desktop\real time chat application\.agents"
OUTPUT_DIR = r"C:\Users\Pranav\.gemini\antigravity-ide\brain\4a471250-f068-4b24-9e97-4c0e2b366a28"

def parse_skill_md(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        parts = content.split('---')
        if len(parts) >= 3:
            frontmatter_raw = parts[1]
            body_raw = '---'.join(parts[2:]).strip()
            
            try:
                frontmatter = yaml.safe_load(frontmatter_raw)
            except:
                frontmatter = {}
                
            return {
                "frontmatter": frontmatter,
                "body_raw": body_raw,
                "body_hash": hashlib.md5(body_raw.encode('utf-8')).hexdigest()
            }
    except Exception as e:
        print(f"Error parsing {filepath}: {e}")
    return None

def scan_plugins_for_refs(skill_folder_name):
    # Quick scan of all files in PLUGINS_DIR to see if the skill name appears
    found_refs = []
    if not os.path.exists(PLUGINS_DIR):
        return found_refs
        
    for root, dirs, files in os.walk(PLUGINS_DIR):
        for file in files:
            fp = os.path.join(root, file)
            try:
                with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    if skill_folder_name in content:
                        found_refs.append(fp)
            except:
                pass
    return found_refs

def main():
    print("Phase 1: Inventory")
    skills = []
    
    if not os.path.exists(SKILLS_DIR):
        print(f"Skills dir not found: {SKILLS_DIR}")
        return

    skill_dirs = [d for d in os.listdir(SKILLS_DIR) if os.path.isdir(os.path.join(SKILLS_DIR, d))]
    for d in skill_dirs:
        skill_md_path = os.path.join(SKILLS_DIR, d, "SKILL.md")
        if os.path.exists(skill_md_path):
            parsed = parse_skill_md(skill_md_path)
            if parsed:
                frontmatter = parsed.get("frontmatter") or {}
                skills.append({
                    "folder": d,
                    "name": frontmatter.get("name", d),
                    "description": frontmatter.get("description", ""),
                    "body_hash": parsed.get("body_hash"),
                    "refs": []
                })

    print(f"Found {len(skills)} skills.")

    print("Phase 5: Dependency checking (doing this early to inform safety)")
    for s in skills:
        refs = scan_plugins_for_refs(s["folder"])
        s["refs"] = refs

    print("Phase 2 & 3: Clustering and Duplicate Detection")
    # Group by hash for exact duplicates
    hash_groups = {}
    for s in skills:
        hash_groups.setdefault(s["body_hash"], []).append(s)
    
    # Simple clustering by prefix
    clusters = {}
    for s in skills:
        folder = s["folder"]
        prefix = folder.split("-")[0] if "-" in folder else folder
        clusters.setdefault(prefix, []).append(s)
        s["cluster"] = prefix
        
    print("Phase 4: Safety Analysis")
    for s in skills:
        s["action"] = "KEEP" # default
        s["reason"] = "Unique and valid"
        
        # Check exact duplicates
        group = hash_groups.get(s["body_hash"], [])
        if len(group) > 1:
            # Sort by name length, keep shortest name as canonical usually, or first one
            sorted_group = sorted(group, key=lambda x: len(x["folder"]))
            if s["folder"] != sorted_group[0]["folder"]:
                if len(s["refs"]) == 0:
                    s["action"] = "DELETE"
                    s["reason"] = f"Exact duplicate of {sorted_group[0]['folder']}"
                else:
                    s["action"] = "KEEP"
                    s["reason"] = f"Exact duplicate but has references in {len(s['refs'])} files"

    # Identify project-specific vs global
    project_keywords = ["odoo", "shopify", "wordpress", "azure", "aws", "gcp", "m365", "apify"]
    
    for s in skills:
        if s["action"] in ["KEEP", "MERGE"]:
            is_project_specific = any(kw in s["folder"].lower() for kw in project_keywords)
            if is_project_specific:
                s["recommended_scope"] = "PROJECT"
                s["action"] = "ARCHIVE" # move to archive then potentially project
                s["reason"] = "Project-specific skill (move to .agents)"
            else:
                s["recommended_scope"] = "GLOBAL"
                
    print("Writing artifacts...")
    with open(os.path.join(OUTPUT_DIR, "skills_inventory.json"), "w", encoding='utf-8') as f:
        json.dump(skills, f, indent=2)

    recommended = [s for s in skills if s["action"] == "KEEP" and s["recommended_scope"] == "GLOBAL"]
    with open(os.path.join(OUTPUT_DIR, "recommended-global-skills.md"), "w", encoding='utf-8') as f:
        f.write("# Recommended Global Skills\n\n")
        f.write(f"Target count: {len(recommended)}\n\n")
        for s in recommended:
            f.write(f"- **{s['folder']}**: {s['description']}\n")

    deleted = [s for s in skills if s["action"] == "DELETE"]
    with open(os.path.join(OUTPUT_DIR, "deleted_skills_report.md"), "w", encoding='utf-8') as f:
        f.write("# Deleted Skills Report\n\n")
        f.write("The following skills have been marked for deletion:\n\n")
        for s in deleted:
            f.write(f"- **{s['folder']}**: {s['reason']}\n")

    print("Done")

if __name__ == '__main__':
    main()
