#!/usr/bin/env bash
set -euo pipefail
#
# dup-fix-optimal.sh
# Detect top-n duplicate clusters with jscpd, extract canonical modules,
# generate per-occurrence instructions, and optionally apply safe edits.
#
# Usage:
#   chmod +x dup-fix-optimal.sh
#   ./dup-fix-optimal.sh             # dry-run: generate artifacts in ./dup-fix-output
#   ./dup-fix-optimal.sh --apply     # apply edits, commit per change
#
# Notes:
# - Requires: pnpm, jq, git, sed, awk, python3
# - Working tree must be clean. The script creates a branch for changes.
# - It DOES NOT auto-resolve semantic/near-duplicate issues. Review outputs before apply.
#

ROOT="$(pwd)"
OUTDIR="${ROOT}/dup-fix-output"
REPORT="${OUTDIR}/jscpd-report.json"
MIN_TOKENS=50
TOP_N=3
EXTRACT_DIR="${OUTDIR}/extracted"
INSTR_DIR="${OUTDIR}/instructions"

# Cleanup function for temporary files
cleanup() {
  rm -f "$tmp" 2>/dev/null || true
}
trap cleanup EXIT

# Rollback function for git operations
rollback() {
  echo "ERROR: Rolling back to previous state..."
  git checkout main 2>/dev/null || true
  git branch -D "$BRANCH" 2>/dev/null || true
  exit 1
}
trap rollback ERR

# Input validation function
validate_input() {
  local value="$1"
  local type="$2"
  
  case "$type" in
    "number")
      if ! [[ "$value" =~ ^[0-9]+$ ]]; then
        echo "ERROR: Invalid number: $value"
        return 1
      fi
      ;;
    "path")
      if [[ "$value" != "$ROOT"/* ]]; then
        echo "ERROR: Path outside project root: $value"
        return 1
      fi
      ;;
    "identifier")
      if [[ ! "$value" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
        echo "ERROR: Invalid identifier: $value"
        return 1
      fi
      ;;
  esac
  return 0
}

# Validate export name and generate safe import statement
generate_import_statement() {
  local name="$1"
  local rel_path="$2"
  
  if ! validate_input "$name" "identifier"; then
    echo "WARNING: Invalid export name: $name, skipping import"
    return 1
  fi
  
  # Escape special characters in the relative path
  local escaped_path=$(printf '%s\n' "$rel_path" | sed 's/[[\.*^$()+?{|]/\\&/g')
  
  echo "import { $name } from '${rel_path}';"
}

# Safe relative path calculation
calculate_relative_path() {
  local target_file="$1"
  local module_file="$2"
  
  # Validate paths are within project root
  if ! validate_input "$target_file" "path" || ! validate_input "$module_file" "path"; then
    return 1
  fi
  
  # Use python3 for safe path calculation
  python3 -c "
import os
import sys

target = sys.argv[1]
module = sys.argv[2]

try:
    # Calculate relative path
    rel = os.path.relpath(module, os.path.dirname(target)).replace(os.sep, '/')
    
    # Remove .ts extension if present
    if rel.endswith('.ts'):
        rel = rel[:-3]
    
    # Validate the result doesn't contain dangerous characters
    if '..' in rel or rel.startswith('/'):
        print('ERROR: Invalid relative path', file=sys.stderr)
        sys.exit(1)
    
    print(rel)
except Exception as e:
    print(f'ERROR: Path calculation failed: {e}', file=sys.stderr)
    sys.exit(1)
" "$target_file" "$module_file"
}

if ! command -v pnpm >/dev/null 2>&1; then echo "ERROR: pnpm required"; exit 1; fi
if ! command -v jq >/dev/null 2>&1; then echo "ERROR: jq required"; exit 1; fi
if ! command -v python3 >/dev/null 2>&1; then echo "ERROR: python3 required"; exit 1; fi
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: working tree not clean. Commit or stash changes before running."
  git status --porcelain
  exit 1
fi

APPLY=false
if [ "${1-}" = "--apply" ]; then APPLY=true; fi

rm -rf "$OUTDIR"
mkdir -p "$OUTDIR" "$EXTRACT_DIR" "$INSTR_DIR"

echo "1) Running jscpd (min tokens = $MIN_TOKENS)..."
pnpm dlx jscpd --min-tokens "$MIN_TOKENS" --reporters console,json --output "$OUTDIR" src/ || true

# Handle jscpd output - it might create a directory or file
if [ -d "$REPORT" ]; then
  # If it created a directory, look for the report file inside
  REPORT_FILE="${REPORT}/jscpd-report.json"
elif [ -f "$REPORT" ]; then
  # If it created a file directly
  REPORT_FILE="$REPORT"
else
  echo "ERROR: jscpd report not produced"
  exit 1
fi

if [ ! -f "$REPORT_FILE" ]; then echo "ERROR: jscpd report file not found at $REPORT_FILE"; exit 1; fi

# Validate jscpd report structure
if ! jq -e '.duplicates' "$REPORT_FILE" >/dev/null 2>&1; then
  echo "ERROR: Invalid jscpd report format"
  exit 1
fi

DUP_COUNT=$(jq '.duplicates | length' "$REPORT_FILE")
echo "jscpd clusters found: $DUP_COUNT"

if [ "$DUP_COUNT" -eq 0 ]; then echo "No duplication found. Exiting."; exit 0; fi

# Build top-N clusters array
jq -r ".duplicates | sort_by(-.tokens) | .[0:$TOP_N] | to_entries | .[]" "$REPORT_FILE" > "${OUTDIR}/top_clusters.json"

python3 - <<PY
import json, os, re, pathlib
ROOT=os.getcwd()
REPORT="$REPORT_FILE"
OUTDIR=os.path.join("dup-fix-output")
EXTRACT_DIR=os.path.join(OUTDIR,"extracted")
INSTR_DIR=os.path.join(OUTDIR,"instructions")
TOP_N=3

data=json.load(open(REPORT))
dups=sorted(data.get("duplicates",[]), key=lambda d: -d.get("tokens",0))[:TOP_N]
if not dups:
    print("No top duplicates.")
    raise SystemExit(0)

def detect_name(fragment):
    # try common exported patterns
    m=re.search(r"export\s+(?:const|let|var|function|class|type|interface)\s+([A-Za-z0-9_]+)", fragment)
    if m: return m.group(1)
    m=re.search(r"(?:const|let|var|function|class)\s+([A-Za-z0-9_]+)\s*(?:=|\(|\{)", fragment)
    if m: return m.group(1)
    # try schema name (zod) like ParcelSchema = z.object
    m=re.search(r"([A-Za-z0-9_]+Schema)\s*=", fragment)
    if m: return m.group(1)
    return None

for idx, cl in enumerate(dups, start=1):
    cid = cl.get("id", f"cluster_{idx}")
    tokens = cl.get("tokens",0)
    fragment = cl.get("fragment","").rstrip()
    instances = cl.get("instances",[])
    if not instances:
        continue
    name = detect_name(fragment) or f"EXTRACTED_{idx}"
    # canonical module path
    mod_fname = f"cluster_{idx}_{name}.ts"
    mod_path = os.path.join(EXTRACT_DIR, mod_fname)
    header = f"// AUTO-EXTRACTED: {cid}\n// Review before merging.\n\n"
    # ensure exported if possible
    if "export" not in fragment and re.search(rf"\b{name}\b", fragment):
        fragment = re.sub(rf"((?:const|let|var|function|class)\s+{name})", r"export \1", fragment, count=1)
    with open(mod_path, "w", encoding="utf8") as mf:
        mf.write(header + fragment + "\n")
    print(f"WROTE {mod_path}")
    # produce instructions for other instances (keep first as canonical)
    for inst_i, inst in enumerate(instances[1:], start=2):
        path = inst.get("path")
        start = inst.get("start")
        end = inst.get("end")
        instr = {
            "cluster_id": cid,
            "cluster_tokens": tokens,
            "module": mod_path,
            "export_name": name,
            "target_file": path,
            "start": start,
            "end": end
        }
        instr_path = os.path.join(INSTR_DIR, f"instr_{idx}_{inst_i}_{os.path.basename(path)}.json")
        pathlib.Path(os.path.dirname(instr_path)).mkdir(parents=True, exist_ok=True)
        with open(instr_path,"w",encoding="utf8") as f:
            json.dump(instr,f,indent=2)
        print(f"INSTR {instr_path} -> replace {path}:{start}-{end}")
print("\nAll instruction files are in: dup-fix-output/instructions")
PY

echo
echo "2) Review generated canonical modules:"
ls -la "$EXTRACT_DIR"
echo "Instruction files:"
ls -la "$INSTR_DIR"

if [ "$APPLY" = false ]; then
  echo
  echo "DRY RUN complete. Review files in $OUTDIR:"
  echo " - Extracts: $EXTRACT_DIR"
  echo " - Instructions: $INSTR_DIR"
  echo
  echo "To apply edits run: ./dup-fix-optimal.sh --apply"
  exit 0
fi

# APPLY mode: perform changes safely: remove block then insert import at top
BRANCH="fix/duplication-$(date +%s)"
git checkout -b "$BRANCH"

for instr in "${INSTR_DIR}"/*.json; do
  [ -e "$instr" ] || continue
  echo
  echo "Processing instruction: $instr"
  
  # Validate instruction file exists and is readable
  if [ ! -r "$instr" ]; then
    echo "ERROR: Cannot read instruction file: $instr"
    continue
  fi
  
  # Parse JSON safely
  if ! json=$(cat "$instr"); then
    echo "ERROR: Failed to read instruction file: $instr"
    continue
  fi
  
  # Extract values with validation
  target=$(jq -r '.target_file' <<<"$json")
  start=$(jq -r '.start' <<<"$json")
  end=$(jq -r '.end' <<<"$json")
  module=$(jq -r '.module' <<<"$json")
  name=$(jq -r '.export_name' <<<"$json")
  
  # Validate extracted values
  if [ "$target" = "null" ] || [ "$start" = "null" ] || [ "$end" = "null" ] || [ "$module" = "null" ] || [ "$name" = "null" ]; then
    echo "ERROR: Invalid instruction data in $instr"
    continue
  fi
  
  # Validate line numbers
  if ! validate_input "$start" "number" || ! validate_input "$end" "number"; then
    echo "ERROR: Invalid line numbers in $instr: start=$start, end=$end"
    continue
  fi
  
  if [ "$start" -gt "$end" ]; then
    echo "ERROR: Start line ($start) > end line ($end) in $instr"
    continue
  fi
  
  # Validate paths
  if ! validate_input "$target" "path" || ! validate_input "$module" "path"; then
    echo "ERROR: Invalid file paths in $instr"
    continue
  fi
  
  # Check if target file exists
  if [ ! -f "$target" ]; then
    echo "ERROR: Target file not found: $target (may have been moved/deleted)"
    continue
  fi
  
  # Calculate relative path safely
  if ! rel=$(calculate_relative_path "$target" "$module"); then
    echo "ERROR: Failed to calculate relative path for $target -> $module"
    continue
  fi
  
  # Generate import statement safely
  if ! IMPORT_LINE=$(generate_import_statement "$name" "$rel"); then
    echo "ERROR: Failed to generate import statement for $name from $rel"
    continue
  fi
  
  # Create temporary file for safe editing
  tmp="$(mktemp)"
  
  # Remove block lines start..end
  echo " - removing lines ${start}-${end} from ${target}"
  if ! awk -v a="$start" -v b="$end" 'NR<a || NR>b' "$target" > "$tmp"; then
    echo "ERROR: Failed to remove lines from $target"
    rm -f "$tmp"
    continue
  fi
  
  # Move temporary file to target
  if ! mv "$tmp" "$target"; then
    echo "ERROR: Failed to update $target"
    rm -f "$tmp"
    continue
  fi
  
  # Check if import already exists
  if grep -q "from '${rel}'" "$target" || grep -q "from \"$rel\"" "$target"; then
    echo " - import already present for ${rel}, skipping import insertion"
  else
    # Find insertion line: after shebang (if present) and after top comment block
    INS_LINE=1
    first_line=$(sed -n '1p' "$target" || true)
    if [[ "$first_line" =~ ^#! ]]; then
      INS_LINE=2
    fi
    
    # Insert import at INS_LINE
    if ! awk -v il="$INS_LINE" -v imp="$IMPORT_LINE" 'NR==il{print imp} {print}' "$target" > "${target}.tmp"; then
      echo "ERROR: Failed to insert import into $target"
      continue
    fi
    
    if ! mv "${target}.tmp" "$target"; then
      echo "ERROR: Failed to update $target with import"
      continue
    fi
    
    echo " - inserted import: $IMPORT_LINE at line $INS_LINE"
  fi
  
  # Stage and commit changes
  if ! git add "$target"; then
    echo "ERROR: Failed to stage changes for $target"
    continue
  fi
  
  if ! git commit -m "refactor(dup): remove duplicated block and import ${name} from ${rel} in ${target}"; then
    echo "ERROR: Failed to commit changes for $target"
    exit 1
  fi
  
  echo " - successfully processed $target"
done

echo
echo "APPLY complete. Now run type-check and tests."
pnpm run type-check || { echo "TYPECHECK FAILED - inspect commits and revert if needed"; exit 1; }
pnpm run lint || echo "Lint warnings/errors detected (fix manually)"
pnpm test:unit || { echo "UNIT TESTS FAILED - inspect commits and revert if needed"; exit 1; }
pnpm test:integration || { echo "INTEGRATION TESTS FAILED - inspect commits and revert if needed"; exit 1; }

echo
echo "All checks passed. Push branch:"
echo "  git push --set-upstream origin ${BRANCH}"
echo "Review and open PR. Inspect files under $OUTDIR for canonical modules and instruction logs."

