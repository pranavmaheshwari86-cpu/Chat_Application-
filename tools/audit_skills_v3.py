import os
import glob
import json
import yaml
import hashlib
import re
from pathlib import Path

SKILLS_DIR = r"C:\Users\Pranav\.gemini\config\skills"
OUTPUT_MD = r"C:\Users\Pranav\.gemini\antigravity-ide\brain\f157a4e0-8d5f-45e7-923a-390685c23a08\skills_audit_report.md"

def parse_skill_md(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
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
                "body_hash": hashlib.md5(body_raw.encode('utf-8')).hexdigest(),
                "size": len(content)
            }
        else:
            return {
                "frontmatter": {},
                "body_raw": content,
                "body_hash": hashlib.md5(content.encode('utf-8')).hexdigest(),
                "size": len(content)
            }
    except Exception as e:
        pass
    return None

def categorize(name, desc):
    text = (name + " " + desc).lower()
    categories = []
    
    # 6. Detect overlapping orchestrators
    if any(k in text for k in ['orchestrat', 'multi-agent', 'coordinator', 'conductor', 'dispatch', 'manager', 'router']):
        categories.append('Orchestrator')
        
    # 7. Detect overlapping token optimization skills
    if any(k in text for k in ['token', 'context compression', 'context optim', 'saver']):
        categories.append('Token Optimization')
        
    # 8. Detect overlapping debugging skills
    if any(k in text for k in ['debug', 'error', 'troubleshoot', 'trace', 'diagnost', 'fix']):
        categories.append('Debugging')
        
    # 9. Detect overlapping architecture skills
    if any(k in text for k in ['architect', 'system design', 'c4', 'domain-driven', 'ddd', 'monolith', 'microservice']):
        categories.append('Architecture')
        
    # 10. Detect overlapping code review skills
    if any(k in text for k in ['review', 'pr-writer', 'pull request', 'audit code', 'code review']):
        categories.append('Code Review')
        
    # Other functional categories
    if any(k in text for k in ['frontend', 'react', 'vue', 'angular', 'ui', 'css']):
        categories.append('Frontend')
    if any(k in text for k in ['backend', 'api', 'node', 'python', 'java', 'go']):
        categories.append('Backend')
    if any(k in text for k in ['cloud', 'aws', 'azure', 'gcp', 'devops', 'ci/cd', 'docker', 'kubernetes']):
        categories.append('Cloud/DevOps')
    if any(k in text for k in ['ai', 'ml', 'model', 'llm', 'prompt']):
        categories.append('AI/ML')
    if any(k in text for k in ['test', 'qa', 'e2e', 'cypress', 'jest']):
        categories.append('Testing')
    if any(k in text for k in ['securit', 'pentest', 'audit', 'vulnerabil']):
        categories.append('Security')
    if any(k in text for k in ['database', 'sql', 'postgres', 'mongo', 'nosql']):
        categories.append('Database')
        
    if not categories:
        categories.append('Other')
    return categories

def jaccard_similarity(s1, s2):
    set1 = set(s1.lower().split())
    set2 = set(s2.lower().split())
    if not set1 and not set2:
        return 1.0
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    return len(intersection) / len(union) if union else 0

def main():
    print("Starting Skill Audit...")
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
                name = frontmatter.get("name", d) if isinstance(frontmatter, dict) else d
                desc = frontmatter.get("description", "") if isinstance(frontmatter, dict) else ""
                if not isinstance(name, str): name = str(name)
                if not isinstance(desc, str): desc = str(desc)
                
                cats = categorize(name, desc)
                
                is_deprecated = any(kw in (name+" "+desc+parsed["body_raw"]).lower() for kw in ['deprecated', 'obsolete', 'legacy', 'abandoned', 'no longer maintained'])
                
                skills.append({
                    "folder": d,
                    "name": name,
                    "description": desc,
                    "body_raw": parsed["body_raw"],
                    "body_hash": parsed.get("body_hash"),
                    "size": parsed.get("size", 0),
                    "categories": cats,
                    "is_deprecated": is_deprecated,
                    "action": "KEEP",
                    "reason": "",
                    "group_id": None
                })

    print(f"Parsed {len(skills)} skills.")

    # Exact duplicates
    hash_groups = {}
    for s in skills:
        hash_groups.setdefault(s["body_hash"], []).append(s)
        
    duplicates = []
    for h, group in hash_groups.items():
        if len(group) > 1:
            duplicates.append(group)
            
    # Near duplicates
    print("Detecting Near Duplicates...")
    near_duplicates = []
    processed = set()
    for i, s1 in enumerate(skills):
        if i in processed: continue
        group = [s1]
        for j, s2 in enumerate(skills[i+1:], start=i+1):
            if j in processed: continue
            if s1["body_hash"] == s2["body_hash"]: continue
            
            if min(s1["size"], s2["size"]) / max(1, max(s1["size"], s2["size"])) < 0.5:
                continue
                
            ratio = jaccard_similarity(s1["body_raw"][:3000], s2["body_raw"][:3000])
            if ratio > 0.85:
                group.append(s2)
                processed.add(j)
        if len(group) > 1:
            near_duplicates.append(group)
            
    # Overlapping specific categories
    print("Finding Category Overlaps...")
    overlap_cats = ['Orchestrator', 'Token Optimization', 'Debugging', 'Architecture', 'Code Review']
    cat_groups = {c: [] for c in overlap_cats}
    for s in skills:
        for c in s["categories"]:
            if c in overlap_cats:
                cat_groups[c].append(s)

    # Compile the final lists
    duplicate_groups_report = []
    
    def process_group(group, group_type, confidence, reason_prefix):
        sorted_group = sorted(group, key=lambda x: (-x["size"], len(x["folder"])))
        primary = sorted_group[0]
        removes = sorted_group[1:]
        
        for r in removes:
            r["action"] = "REMOVE" if group_type == "Exact Duplicate" else "MERGE"
            r["reason"] = f"{group_type} of {primary['folder']}"
            
        duplicate_groups_report.append({
            "type": group_type,
            "primary": primary["folder"],
            "removes": [r["folder"] for r in removes],
            "confidence": confidence,
            "reason": f"{reason_prefix} - Keep {primary['folder']} as it has more content or better name."
        })

    for g in duplicates:
        process_group(g, "Exact Duplicate", "High (100%)", "Identical MD5 hash.")
        
    for g in near_duplicates:
        process_group(g, "Near Duplicate", "Medium (85%+ Jaccard similarity)", "High text similarity.")
        
    for c, g in cat_groups.items():
        if len(g) > 1:
            primary = sorted(g, key=lambda x: (-x["size"], len(x["folder"])))[0]
            removes = [x for x in g if x["folder"] != primary["folder"]]
            duplicate_groups_report.append({
                "type": f"Overlapping {c}",
                "primary": primary["folder"],
                "removes": [r["folder"] for r in removes],
                "confidence": "Low (Category overlap)",
                "reason": f"Both serve the {c} function."
            })
            for r in removes:
                if r["action"] == "KEEP":
                    r["action"] = "REVIEW"
                    r["reason"] = f"Overlaps with {primary['folder']} in {c}"

    # Deprecated
    deprecated_skills = [s for s in skills if s["is_deprecated"]]
    for s in deprecated_skills:
        if s["action"] == "KEEP":
            s["action"] = "REMOVE"
            s["reason"] = "Marked as deprecated/abandoned."

    print("Generating Markdown Report...")
    # Write Markdown
    os.makedirs(os.path.dirname(OUTPUT_MD), exist_ok=True)
    with open(OUTPUT_MD, 'w', encoding='utf-8') as f:
        f.write("# Skill Inventory Audit Report\n\n")
        f.write("> **Note**: No files have been automatically deleted. This is an audit report.\n\n")
        
        f.write("## 1. Categorization by Function\n")
        cats_count = {}
        for s in skills:
            for c in s["categories"]:
                cats_count[c] = cats_count.get(c, 0) + 1
                
        # Sort categories by count
        for c, count in sorted(cats_count.items(), key=lambda x: x[1], reverse=True):
            f.write(f"- **{c}**: {count} skills\n")
            
        f.write("\n## 2-10. Duplicate & Overlap Groups\n")
        f.write("This section covers exact duplicates, near-duplicates, and functional overlaps (Orchestrators, Token Optimization, Debugging, Architecture, Code Review).\n\n")
        
        for g in duplicate_groups_report:
            f.write(f"### {g['type']}: `{g['primary']}`\n")
            f.write(f"- **Primary skill to keep**: `{g['primary']}`\n")
            f.write(f"- **Skills safe to remove/merge**: {', '.join(['`'+x+'`' for x in g['removes']])}\n")
            f.write(f"- **Confidence score**: {g['confidence']}\n")
            f.write(f"- **Reasoning**: {g['reason']}\n\n")
            
        f.write("\n## A. Keep List\n")
        keeps = [s for s in skills if s["action"] == "KEEP"]
        f.write(f"Total to keep: **{len(keeps)}**\n\n")
        for s in keeps[:30]:
            f.write(f"- `{s['folder']}`\n")
        if len(keeps) > 30:
            f.write(f"- *(...and {len(keeps) - 30} more)*\n")
            
        f.write("\n## B. Remove List\n")
        removes = [s for s in skills if s["action"] == "REMOVE"]
        f.write(f"Total to remove: **{len(removes)}**\n\n")
        for s in removes:
            f.write(f"- `{s['folder']}` *(Reason: {s['reason']})*\n")
            
        f.write("\n## C. Merge List\n")
        merges = [s for s in skills if s["action"] in ["MERGE", "REVIEW"]]
        f.write(f"Total to merge/review: **{len(merges)}**\n\n")
        for s in merges:
            f.write(f"- `{s['folder']}` *(Reason: {s['reason']})*\n")
            
        f.write("\n## D. Potential Conflicts & Abandoned\n")
        f.write("The following skills contain terms indicating they might be deprecated, abandoned, or obsolete:\n\n")
        for s in deprecated_skills:
            f.write(f"- `{s['folder']}`\n")
            
        saved_bytes = sum(s["size"] for s in skills if s["action"] in ["REMOVE", "MERGE", "REVIEW"])
        f.write("\n## E. Estimated reduction in prompt/context overhead\n")
        f.write(f"Removing or merging the suggested skills would save approximately **{saved_bytes / 1024:.2f} KB** of context window overhead (assuming all were loaded).\n")

    print(f"Report generated at {OUTPUT_MD}")

if __name__ == '__main__':
    main()
