#!/usr/bin/env node

// ═══════════════════════════════════════════════════════════════════════
// DiffScope CLI — Extract codebase structure + PR diff data from any
// git repo and generate an interactive spatial heatmap visualization.
//
// Usage:
//   node diffscope.mjs <repo-path> [options]
//
// Options:
//   --base <ref>       Base branch/commit (default: main, falls back to master)
//   --compare <ref>    Compare branch/commit (default: HEAD)
//   --output <path>    Output HTML file (default: diffscope-report.html)
//   --json             Also output raw JSON data
//   --ignore <glob>    Comma-separated patterns to ignore (default: node_modules,dist,.git,.next,vendor,build,coverage,__pycache__)
//   --risk-paths <json>  JSON map of path patterns to risk levels for custom risk rules
//   --help             Show this help
//
// Examples:
//   node diffscope.mjs .
//   node diffscope.mjs /path/to/repo --base main --compare feature/new-auth
//   node diffscope.mjs . --base HEAD~5 --compare HEAD
//   node diffscope.mjs . --base main --compare dev --output review.html --json
// ═══════════════════════════════════════════════════════════════════════

import { spawnSync } from "child_process";
import { existsSync, writeFileSync, readFileSync, statSync, readdirSync } from "fs";
import { join, relative, resolve, extname, basename, dirname } from "path";

// ─── CLI Argument Parsing ─────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(flag, defaultValue = null) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return defaultValue;
}

function hasFlag(flag) {
  return args.includes(flag);
}

if (hasFlag("--help") || hasFlag("-h")) {
  console.log(`
DiffScope — Spatial code review heatmap generator

Usage:
  node diffscope.mjs <repo-path> [options]

Options:
  --base <ref>       Base branch/commit (default: main or master)
  --compare <ref>    Compare branch/commit (default: HEAD)
  --output <path>    Output HTML file (default: diffscope-report.html)
  --json             Also output raw JSON data file
  --ignore <glob>    Comma-separated ignore patterns
                     (default: node_modules,dist,.git,.next,vendor,build,coverage,__pycache__)
  --help             Show this help

Examples:
  node diffscope.mjs .
  node diffscope.mjs . --base main --compare feature/auth-rewrite
  node diffscope.mjs . --base HEAD~10 --compare HEAD
  node diffscope.mjs /path/to/repo --output review.html --json
  `);
  process.exit(0);
}

// Repo path is the first non-flag argument
const repoPath = resolve(args.find((a) => !a.startsWith("--") && args.indexOf(a) === 0) || ".");
const outputPath = resolve(getArg("--output", "diffscope-report.html"));
const emitJson = hasFlag("--json");
const ignorePatterns = (getArg("--ignore", "node_modules,dist,.git,.next,vendor,build,coverage,__pycache__,.venv,target,.cache,.turbo,.nuxt"))
  .split(",")
  .map((s) => s.trim());

// ─── Validation ───────────────────────────────────────────────────────

if (!existsSync(repoPath)) {
  console.error(`❌ Path does not exist: ${repoPath}`);
  process.exit(1);
}

if (!existsSync(join(repoPath, ".git"))) {
  console.error(`❌ Not a git repository: ${repoPath}`);
  process.exit(1);
}

function git(cmd) {
  try {
    // Split on whitespace; git refs and paths typically don't include unescaped spaces.
    const parts = String(cmd).trim().split(/\s+/);
    const res = spawnSync("git", parts, { cwd: repoPath, encoding: "utf-8" });
    if (res.error || res.status !== 0) return null;
    const out = res.stdout || "";
    // Protect memory by capping returned size to ~50MB (same as previous maxBuffer)
    if (Buffer.byteLength(out, "utf8") > 50 * 1024 * 1024) return null;
    return out.trim();
  } catch (e) {
    return null;
  }
}

// ─── Detect base branch ───────────────────────────────────────────────

let baseBranch = getArg("--base", null);
if (!baseBranch) {
  // Try main, then master, then the default branch
  const branches = git("branch --list") || "";
  if (branches.includes("main")) baseBranch = "main";
  else if (branches.includes("master")) baseBranch = "master";
  else {
    // Use the first branch we find
    const first = branches.split("\n").map(b => b.trim().replace(/^\* /, "")).filter(Boolean)[0];
    baseBranch = first || "HEAD~1";
  }
}

const compareBranch = getArg("--compare", "HEAD");

// --- Input validation -------------------------------------------------
function isSafeRef(ref) {
  if (!ref || typeof ref !== 'string') return false;
  // allow common git ref chars: letters, numbers, dot, dash, slash, tilde, caret, underscore
  return /^[\w.\-\/~^]+$/.test(ref);
}

function isSafeOutputPath(p) {
  if (!p || typeof p !== 'string') return false;
  // disallow null bytes and shell metacharacters that could cause surprises
  if (/\x00|[<>|&;`\\]/.test(p)) return false;
  return true;
}

if (baseBranch && !isSafeRef(baseBranch)) {
  console.error(`❌ Unsafe base ref: ${baseBranch}`);
  process.exit(1);
}
if (compareBranch && !isSafeRef(compareBranch)) {
  console.error(`❌ Unsafe compare ref: ${compareBranch}`);
  process.exit(1);
}
if (!isSafeOutputPath(outputPath)) {
  console.error(`❌ Unsafe output path: ${outputPath}`);
  process.exit(1);
}

if (process.getuid && process.getuid() === 0) {
  console.warn('⚠️ Running as root is discouraged — run as an unprivileged user.');
}
// ---------------------------------------------------------------------

console.log(`\n🔭 DiffScope — Spatial Code Review\n`);
console.log(`   Repo:    ${repoPath}`);
console.log(`   Base:    ${baseBranch}`);
console.log(`   Compare: ${compareBranch}`);
console.log(`   Output:  ${outputPath}\n`);

// Verify the refs exist
const baseValid = git(`rev-parse --verify ${baseBranch}`);
const compareValid = git(`rev-parse --verify ${compareBranch}`);

if (!baseValid) {
  console.error(`❌ Base ref not found: ${baseBranch}`);
  console.error(`   Available branches: ${git("branch --list") || "(none)"}`);
  process.exit(1);
}
if (!compareValid) {
  console.error(`❌ Compare ref not found: ${compareBranch}`);
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════
// STEP 1: Extract codebase file tree from the compare ref
// ═══════════════════════════════════════════════════════════════════════

console.log("📂 Extracting codebase structure...");

const fileListRaw = git(`ls-tree -r --name-only ${compareBranch}`);
if (!fileListRaw) {
  console.error("❌ Could not list files from compare ref");
  process.exit(1);
}

const allFiles = fileListRaw.split("\n").filter(Boolean);

// Filter out ignored patterns
function shouldIgnore(filePath) {
  return ignorePatterns.some((pattern) => {
    const parts = filePath.split("/");
    return parts.some((part) => part === pattern || part.startsWith(pattern));
  });
}

const files = allFiles.filter((f) => !shouldIgnore(f));
console.log(`   ${files.length} files (${allFiles.length - files.length} ignored)`);

// Get file sizes via git (works without checkout)
function getFileSizes(fileList) {
  // Use git ls-tree to get blob sizes
  const lsTree = git(`ls-tree -r -l ${compareBranch}`);
  if (!lsTree) return {};

  const sizes = {};
  for (const line of lsTree.split("\n")) {
    // Format: <mode> <type> <hash> <size>\t<path>
    const match = line.match(/^\d+\s+\w+\s+\w+\s+(\d+)\t(.+)$/);
    if (match) {
      sizes[match[2]] = parseInt(match[1], 10);
    }
  }
  return sizes;
}

const fileSizes = getFileSizes(files);

// Approximate line count from byte size (rough: ~40 bytes per line for code)
function estimateLines(byteSize) {
  return Math.max(1, Math.round(byteSize / 40));
}

// Build nested tree structure
function buildTree(fileList, sizes) {
  const root = { name: "root", children: [] };

  for (const filePath of fileList) {
    const parts = filePath.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        const byteSize = sizes[filePath] || 100;
        current.children.push({
          name: part,
          size: estimateLines(byteSize),
          lang: detectLang(part),
          path: filePath,
        });
      } else {
        let dir = current.children.find((c) => c.name === part && c.children);
        if (!dir) {
          dir = { name: part, children: [] };
          current.children.push(dir);
        }
        current = dir;
      }
    }
  }

  // Prune empty directories and flatten single-child dirs
  pruneTree(root);
  return root;
}

function pruneTree(node) {
  if (!node.children) return;
  node.children = node.children.filter((c) => {
    if (c.children) {
      pruneTree(c);
      return c.children.length > 0;
    }
    return true;
  });
}

function detectLang(filename) {
  const ext = extname(filename).toLowerCase();
  const map = {
    ".ts": "typescript", ".tsx": "react", ".js": "javascript", ".jsx": "react",
    ".py": "python", ".rs": "rust", ".go": "go", ".java": "java",
    ".rb": "ruby", ".php": "php", ".cs": "csharp", ".cpp": "cpp",
    ".c": "c", ".h": "c", ".swift": "swift", ".kt": "kotlin",
    ".scala": "scala", ".vue": "vue", ".svelte": "svelte",
    ".html": "html", ".css": "css", ".scss": "scss", ".less": "less",
    ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".toml": "toml",
    ".xml": "xml", ".sql": "sql", ".sh": "shell", ".bash": "shell",
    ".zsh": "shell", ".fish": "shell", ".ps1": "powershell",
    ".md": "markdown", ".mdx": "markdown", ".txt": "text",
    ".dockerfile": "docker", ".tf": "terraform", ".hcl": "terraform",
    ".proto": "protobuf", ".graphql": "graphql", ".gql": "graphql",
    ".lua": "lua", ".r": "r", ".R": "r", ".jl": "julia",
    ".ex": "elixir", ".exs": "elixir", ".erl": "erlang",
    ".hs": "haskell", ".ml": "ocaml", ".clj": "clojure",
    ".dart": "dart", ".zig": "zig", ".nim": "nim",
  };
  const name = basename(filename).toLowerCase();
  if (name === "dockerfile") return "docker";
  if (name === "makefile") return "make";
  if (name === "cmakelists.txt") return "cmake";
  if (name.endsWith(".config.js") || name.endsWith(".config.ts")) return "config";
  return map[ext] || "other";
}

const codebaseTree = buildTree(files, fileSizes);
console.log(`   Tree built: ${countNodes(codebaseTree)} nodes`);

function countNodes(node) {
  if (!node.children) return 1;
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

// ═══════════════════════════════════════════════════════════════════════
// STEP 2: Extract diff data
// ═══════════════════════════════════════════════════════════════════════

console.log("📊 Extracting diff data...");

// Use merge-base for proper 3-way diff when comparing branches
let diffBase = baseBranch;
const mergeBase = git(`merge-base ${baseBranch} ${compareBranch}`);
if (mergeBase) diffBase = mergeBase;

const numstatRaw = git(`diff --numstat ${diffBase}..${compareBranch}`);
const changes = {};
let totalAdded = 0;
let totalRemoved = 0;

if (numstatRaw) {
  for (const line of numstatRaw.split("\n").filter(Boolean)) {
    const parts = line.split("\t");
    if (parts.length < 3) continue;

    let [added, removed, filePath] = parts;

    // Handle binary files
    if (added === "-") added = "0";
    if (removed === "-") removed = "0";

    // Handle renames: {old => new}
    if (filePath.includes(" => ")) {
      const match = filePath.match(/^(.*?)\{.*? => (.*?)\}(.*)$/);
      if (match) {
        filePath = match[1] + match[2] + match[3];
      } else {
        filePath = filePath.split(" => ").pop();
      }
    }

    if (shouldIgnore(filePath)) continue;

    const addedNum = parseInt(added, 10) || 0;
    const removedNum = parseInt(removed, 10) || 0;

    changes[filePath] = {
      added: addedNum,
      removed: removedNum,
    };

    totalAdded += addedNum;
    totalRemoved += removedNum;
  }
}

console.log(`   ${Object.keys(changes).length} files changed`);
console.log(`   +${totalAdded.toLocaleString()} / −${totalRemoved.toLocaleString()} lines`);

// ═══════════════════════════════════════════════════════════════════════
// STEP 3: Risk classification
// ═══════════════════════════════════════════════════════════════════════

console.log("⚠️  Computing risk levels...");

// Default high-risk path patterns
const HIGH_RISK_PATTERNS = [
  { pattern: /auth/i, level: "high", reason: "authentication/authorization" },
  { pattern: /security/i, level: "critical", reason: "security module" },
  { pattern: /crypto/i, level: "critical", reason: "cryptography" },
  { pattern: /secret/i, level: "critical", reason: "secrets management" },
  { pattern: /payment/i, level: "critical", reason: "payment processing" },
  { pattern: /billing/i, level: "high", reason: "billing logic" },
  { pattern: /stripe|paypal|braintree/i, level: "critical", reason: "payment provider" },
  { pattern: /migration/i, level: "high", reason: "database migration" },
  { pattern: /schema/i, level: "high", reason: "schema change" },
  { pattern: /permission/i, level: "high", reason: "permissions" },
  { pattern: /rbac|acl/i, level: "high", reason: "access control" },
  { pattern: /infra|terraform|k8s|kubernetes|docker/i, level: "high", reason: "infrastructure" },
  { pattern: /\.env|config.*prod|secret/i, level: "critical", reason: "configuration/secrets" },
  { pattern: /ci\.yml|\.github\/workflows|Jenkinsfile|\.circleci/i, level: "medium", reason: "CI/CD pipeline" },
  { pattern: /nginx|apache|caddy/i, level: "high", reason: "web server config" },
  { pattern: /\.sql$/i, level: "high", reason: "raw SQL" },
  { pattern: /middleware/i, level: "medium", reason: "middleware" },
  { pattern: /session/i, level: "high", reason: "session management" },
  { pattern: /token/i, level: "high", reason: "token handling" },
  { pattern: /cookie/i, level: "medium", reason: "cookie handling" },
  { pattern: /cors/i, level: "medium", reason: "CORS configuration" },
  { pattern: /rate.?limit/i, level: "medium", reason: "rate limiting" },
  { pattern: /admin/i, level: "medium", reason: "admin functionality" },
  { pattern: /test|spec|__test__|__spec__/i, level: "low", reason: "test file" },
  { pattern: /mock|fixture|stub/i, level: "low", reason: "test infrastructure" },
  { pattern: /readme|changelog|license|contributing/i, level: "low", reason: "documentation" },
  { pattern: /\.lock$|package-lock|yarn\.lock|Cargo\.lock|poetry\.lock/i, level: "low", reason: "lockfile" },
];

function classifyRisk(filePath, change) {
  const magnitude = change.added + change.removed;

  // Check against patterns (highest match wins)
  let maxRisk = null;
  let reason = "";
  const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };

  for (const rule of HIGH_RISK_PATTERNS) {
    if (rule.pattern.test(filePath)) {
      if (!maxRisk || riskOrder[rule.level] > riskOrder[maxRisk]) {
        maxRisk = rule.level;
        reason = rule.reason;
      }
    }
  }

  // If no pattern matched, classify by magnitude
  if (!maxRisk) {
    if (magnitude > 1000) maxRisk = "high";
    else if (magnitude > 300) maxRisk = "medium";
    else maxRisk = "low";
    reason = "change magnitude";
  }

  // Boost risk for very large changes in already-risky files
  if (maxRisk === "high" && magnitude > 500) {
    maxRisk = "critical";
    reason += " + high magnitude";
  }

  return { risk: maxRisk, reason };
}

// Apply risk classification
for (const [path, change] of Object.entries(changes)) {
  const { risk, reason } = classifyRisk(path, change);
  change.risk = risk;
  change.reason = reason;
}

const riskCounts = { critical: 0, high: 0, medium: 0, low: 0 };
Object.values(changes).forEach((c) => riskCounts[c.risk]++);
console.log(`   Critical: ${riskCounts.critical}  High: ${riskCounts.high}  Medium: ${riskCounts.medium}  Low: ${riskCounts.low}`);

// ═══════════════════════════════════════════════════════════════════════
// STEP 4: Get git metadata for the PR summary
// ═══════════════════════════════════════════════════════════════════════

console.log("📝 Gathering PR metadata...");

const commitCount = git(`rev-list --count ${diffBase}..${compareBranch}`) || "0";
const authorLogRaw = git(`log ${diffBase}..${compareBranch} --format=%aN`);
const authorCounts = {};
if (authorLogRaw) {
  for (const name of authorLogRaw.split("\n").filter(Boolean)) {
    authorCounts[name] = (authorCounts[name] || 0) + 1;
  }
}
const authorRaw = Object.entries(authorCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([name, count]) => `${count} ${name}`)
  .join("\n") || null;
const authors = authorRaw
  ? authorRaw.split("\n").map((l) => {
      const match = l.trim().match(/^(\d+)\s+(.+)$/);
      return match ? { name: match[2], commits: parseInt(match[1]) } : null;
    }).filter(Boolean)
  : [];

const latestCommitMsg = git(`log ${compareBranch} -1 --format="%s"`) || "";
const branchName = git(`rev-parse --abbrev-ref ${compareBranch}`) || compareBranch;
const baseBranchName = git(`rev-parse --abbrev-ref ${baseBranch}`) || baseBranch;

// ═══════════════════════════════════════════════════════════════════════
// STEP 5: Compute affected modules (top-level directories)
// ═══════════════════════════════════════════════════════════════════════

const affectedModules = new Set();
Object.keys(changes).forEach((path) => {
  const parts = path.split("/");
  if (parts.length >= 2) affectedModules.add(parts[0] + "/" + parts[1]);
  else affectedModules.add(parts[0]);
});

// ═══════════════════════════════════════════════════════════════════════
// STEP 6: Build the data payload
// ═══════════════════════════════════════════════════════════════════════

const payload = {
  meta: {
    repoPath,
    baseBranch: baseBranchName,
    compareBranch: branchName,
    commitCount: parseInt(commitCount),
    authors,
    latestCommitMsg,
    totalAdded,
    totalRemoved,
    filesChanged: Object.keys(changes).length,
    totalFiles: files.length,
    affectedModules: affectedModules.size,
    riskCounts,
    generatedAt: new Date().toISOString(),
  },
  codebase: codebaseTree,
  changes,
};

// Optionally write raw JSON
if (emitJson) {
  const jsonPath = outputPath.replace(/\.html$/, ".json");
  writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
  console.log(`\n📄 JSON data written to: ${jsonPath}`);
}

// ═══════════════════════════════════════════════════════════════════════
// STEP 7: Generate self-contained HTML report
// ═══════════════════════════════════════════════════════════════════════

console.log("🎨 Generating interactive visualization...");

const html = generateHTML(payload);
writeFileSync(outputPath, html);

console.log(`\n✅ DiffScope report generated!`);
console.log(`   📊 Open in browser: ${outputPath}\n`);

// ═══════════════════════════════════════════════════════════════════════
// HTML GENERATION
// ═══════════════════════════════════════════════════════════════════════

function generateHTML(data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DiffScope — ${escHtml(data.meta.baseBranch)} → ${escHtml(data.meta.compareBranch)}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"><\/script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #0a0a0f;
    color: #e0e0e8;
    font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
    overflow: hidden;
    height: 100vh;
  }

  #app {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .header {
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 10px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255,255,255,0.02);
    flex-shrink: 0;
  }

  .header-left { display: flex; align-items: center; gap: 10px; }

  .logo {
    width: 26px; height: 26px; border-radius: 5px;
    background: linear-gradient(135deg, #ff2d55, #ff6b35, #ffb800);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
  }

  .app-title { font-size: 14px; font-weight: 600; letter-spacing: -0.02em; }

  .branch-info {
    font-size: 11px; color: #666; padding: 4px 10px;
    border-radius: 4px; background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
  }

  .branch-info strong { color: #ffb800; font-weight: 600; }

  .header-controls { display: flex; gap: 6px; }

  .btn {
    background: transparent; border: 1px solid rgba(255,255,255,0.06);
    color: #666; padding: 5px 12px; border-radius: 5px; font-size: 11px;
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .btn:hover { border-color: rgba(255,255,255,0.15); color: #aaa; }
  .btn.active { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.15); color: #fff; }

  .main { display: flex; flex: 1; min-height: 0; }

  .sidebar {
    width: 270px; border-right: 1px solid rgba(255,255,255,0.06);
    overflow-y: auto; flex-shrink: 0; background: rgba(255,255,255,0.01);
    padding: 14px;
  }

  .section-label {
    font-size: 9px; color: #555; text-transform: uppercase;
    letter-spacing: 0.1em; margin-bottom: 8px; font-weight: 600;
  }

  .risk-meter { margin-bottom: 12px; }
  .risk-meter-bar {
    height: 4px; border-radius: 2px; background: rgba(255,255,255,0.06);
    overflow: hidden; margin-top: 5px;
  }
  .risk-meter-fill {
    height: 100%; border-radius: 2px; transition: width 0.4s ease;
  }

  .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; }
  .stat-box {
    padding: 7px 9px; border-radius: 5px; background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.04);
  }
  .stat-value { font-size: 15px; font-weight: 700; color: #fff; }
  .stat-label { font-size: 8px; color: #555; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }

  .risk-badges { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 12px; }
  .risk-badge {
    display: flex; align-items: center; gap: 4px; padding: 2px 7px;
    border-radius: 3px; font-size: 10px; font-weight: 600;
  }
  .risk-dot { width: 6px; height: 6px; border-radius: 2px; }

  .author-list { margin-bottom: 12px; }
  .author-item {
    font-size: 11px; color: #777; padding: 3px 0;
    display: flex; justify-content: space-between;
  }
  .author-item .commits { color: #555; }

  .info-panel {
    padding: 10px; border-radius: 5px; background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.04); margin-bottom: 10px;
  }
  .info-panel p { font-size: 11px; line-height: 1.5; color: #888; }

  .treemap-container {
    flex: 1; position: relative; overflow: hidden; background: #08080d;
  }

  .treemap-container svg { display: block; }

  .tooltip {
    position: absolute; top: 10px; right: 10px;
    background: rgba(15,15,22,0.95); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 7px; padding: 10px 13px; min-width: 220px;
    backdrop-filter: blur(20px); box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    pointer-events: none; z-index: 100; display: none;
  }
  .tooltip.visible { display: block; }
  .tooltip-name { font-size: 12px; font-weight: 600; color: #fff; margin-bottom: 2px; }
  .tooltip-path { font-size: 10px; color: #555; margin-bottom: 7px; }
  .tooltip-stats { display: flex; gap: 10px; margin-bottom: 5px; }
  .tooltip-added { font-size: 11px; color: #34c759; }
  .tooltip-removed { font-size: 11px; color: #ff2d55; }
  .tooltip-risk { display: flex; align-items: center; gap: 5px; }
  .tooltip-risk-label { font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .tooltip-unchanged { font-size: 11px; color: #444; }

  .detail-panel {
    width: 280px; border-left: 1px solid rgba(255,255,255,0.06);
    overflow-y: auto; flex-shrink: 0; background: rgba(255,255,255,0.01);
    padding: 14px; display: none;
  }
  .detail-panel.visible { display: block; }

  .detail-filename {
    font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 3px;
    word-break: break-all; line-height: 1.3;
  }
  .detail-filepath { font-size: 10px; color: #555; margin-bottom: 14px; word-break: break-all; }

  .change-bars { display: flex; gap: 8px; margin-bottom: 8px; }
  .change-bar-item { flex: 1; }
  .change-bar-label { font-size: 9px; color: #555; text-transform: uppercase; margin-bottom: 3px; }
  .change-bar-value { font-size: 17px; font-weight: 700; }

  .visual-bar {
    display: flex; height: 5px; border-radius: 3px; overflow: hidden; gap: 2px; margin-bottom: 14px;
  }
  .visual-bar-added { background: #34c759; border-radius: 3px; }
  .visual-bar-removed { background: #ff2d55; border-radius: 3px; }

  .metric-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.03);
  }
  .metric-label { font-size: 11px; color: #666; }
  .metric-value { font-size: 11px; font-weight: 600; }

  .review-guidance {
    padding: 10px; border-radius: 5px; margin-top: 14px;
  }
  .review-guidance-title {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
    margin-bottom: 5px; font-weight: 600;
  }
  .review-guidance-text { font-size: 11px; line-height: 1.5; color: #888; }

  .zoom-indicator {
    padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.04); margin-top: 10px;
  }
  .zoom-path { font-size: 11px; color: #ffb800; display: flex; align-items: center; gap: 6px; }
  .zoom-reset {
    background: rgba(255,255,255,0.06); border: none; color: #888;
    padding: 2px 6px; border-radius: 3px; font-size: 10px;
    cursor: pointer; font-family: inherit;
  }

  .file-list { margin-top: 12px; }
  .file-list-item {
    padding: 5px 8px; border-radius: 4px; margin-bottom: 3px;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 10px; cursor: pointer; transition: background 0.1s;
    border: 1px solid transparent;
  }
  .file-list-item:hover { background: rgba(255,255,255,0.03); }
  .file-list-item .fname { color: #aaa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .file-list-item .fstats { color: #555; white-space: nowrap; margin-left: 8px; }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
</style>
</head>
<body>
<div id="app">
  <div class="header">
    <div class="header-left">
      <div class="logo">◉</div>
      <span class="app-title">DiffScope</span>
      <div class="branch-info">
        <strong>${escHtml(data.meta.baseBranch)}</strong>
        <span style="color:#444"> → </span>
        <strong>${escHtml(data.meta.compareBranch)}</strong>
        <span style="color:#444"> · </span>
        <span>${data.meta.commitCount} commit${data.meta.commitCount !== 1 ? "s" : ""}</span>
      </div>
    </div>
    <div class="header-controls">
      <button class="btn active" id="btn-heat" onclick="setViewMode('heat')">Heat</button>
      <button class="btn" id="btn-risk" onclick="setViewMode('risk')">Risk</button>
      <button class="btn" id="btn-toggle-unchanged" onclick="toggleUnchanged()">Hide unchanged</button>
    </div>
  </div>

  <div class="main">
    <div class="sidebar" id="sidebar">
      <div class="section-label">Spatial Analysis</div>

      <div class="risk-meter">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:11px;color:#888">Overall Risk</span>
          <span id="risk-score" style="font-size:11px;font-weight:700"></span>
        </div>
        <div class="risk-meter-bar">
          <div class="risk-meter-fill" id="risk-fill"></div>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-box">
          <div class="stat-value">${data.meta.filesChanged}</div>
          <div class="stat-label">Files changed</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${data.meta.affectedModules}</div>
          <div class="stat-label">Modules hit</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color:#34c759">+${data.meta.totalAdded.toLocaleString()}</div>
          <div class="stat-label">Lines added</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color:#ff2d55">−${data.meta.totalRemoved.toLocaleString()}</div>
          <div class="stat-label">Lines removed</div>
        </div>
      </div>

      <div class="risk-badges" id="risk-badges"></div>

      ${data.meta.authors.length > 0 ? `
      <div class="section-label" style="margin-top:10px">Authors</div>
      <div class="author-list">
        ${data.meta.authors.map((a) => `
          <div class="author-item">
            <span>${escHtml(a.name)}</span>
            <span class="commits">${a.commits} commit${a.commits !== 1 ? "s" : ""}</span>
          </div>
        `).join("")}
      </div>` : ""}

      ${data.meta.latestCommitMsg ? `
      <div class="info-panel">
        <div class="section-label">Latest Commit</div>
        <p>${escHtml(data.meta.latestCommitMsg)}</p>
      </div>` : ""}

      <div id="zoom-indicator" class="zoom-indicator" style="display:none">
        <div style="font-size:10px;color:#555;margin-bottom:3px">Zoomed into:</div>
        <div class="zoom-path">
          <span id="zoom-path-text"></span>
          <button class="zoom-reset" onclick="resetZoom()">esc</button>
        </div>
      </div>

      <div class="section-label" style="margin-top:12px">Changed Files</div>
      <div class="file-list" id="file-list"></div>
    </div>

    <div class="treemap-container" id="treemap-container">
      <div class="tooltip" id="tooltip">
        <div class="tooltip-name" id="tooltip-name"></div>
        <div class="tooltip-path" id="tooltip-path"></div>
        <div class="tooltip-stats" id="tooltip-stats"></div>
        <div class="tooltip-risk" id="tooltip-risk"></div>
      </div>
    </div>

    <div class="detail-panel" id="detail-panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div class="section-label" style="margin:0">File Detail</div>
        <button class="zoom-reset" onclick="closeDetail()">✕</button>
      </div>
      <div id="detail-content"></div>
    </div>
  </div>
</div>

<script>
// ═══════════════════════════════════════════════════════════════
// EMBEDDED DATA
// ═══════════════════════════════════════════════════════════════
const DATA = ${safeJsonForHTML(data)};

const RISK_COLORS = {
  critical: "#ff2d55",
  high: "#ff6b35",
  medium: "#ffb800",
  low: "#34c759",
  none: "rgba(255,255,255,0.04)"
};
const RISK_WEIGHTS = { critical: 4, high: 3, medium: 2, low: 1 };

let viewMode = "heat";
let showUnchanged = true;
let zoomNode = null;
let hoveredFile = null;
let selectedFile = null;

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

function init() {
  computeRiskScore();
  renderRiskBadges();
  renderFileList();
  renderTreemap();

  window.addEventListener("resize", () => renderTreemap());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (selectedFile) closeDetail();
      else if (zoomNode) resetZoom();
    }
  });
}

function computeRiskScore() {
  let score = 0, max = 0;
  for (const c of Object.values(DATA.changes)) {
    const mag = c.added + c.removed;
    score += RISK_WEIGHTS[c.risk] * mag;
    max += 4 * mag;
  }
  const ratio = max > 0 ? score / max : 0;
  const pct = (ratio * 100).toFixed(0);

  const el = document.getElementById("risk-score");
  const fill = document.getElementById("risk-fill");
  const color = ratio > 0.6 ? "#ff2d55" : ratio > 0.4 ? "#ff6b35" : ratio > 0.2 ? "#ffb800" : "#34c759";
  el.textContent = pct + "%";
  el.style.color = color;
  fill.style.width = pct + "%";
  fill.style.background = ratio > 0.6
    ? "linear-gradient(90deg, #ff6b35, #ff2d55)"
    : ratio > 0.4
    ? "linear-gradient(90deg, #ffb800, #ff6b35)"
    : "linear-gradient(90deg, #34c759, #ffb800)";
}

function renderRiskBadges() {
  const el = document.getElementById("risk-badges");
  el.innerHTML = Object.entries(DATA.meta.riskCounts)
    .filter(([,v]) => v > 0)
    .map(([level, count]) => {
      const c = RISK_COLORS[level];
      return '<div class="risk-badge" style="background:' + c + '11;border:1px solid ' + c + '22">' +
        '<div class="risk-dot" style="background:' + c + '"></div>' +
        '<span style="color:' + c + '">' + count + ' ' + level + '</span></div>';
    }).join("");
}

function renderFileList() {
  const el = document.getElementById("file-list");
  const sorted = Object.entries(DATA.changes)
    .sort((a, b) => (b[1].added + b[1].removed) - (a[1].added + a[1].removed));

  el.innerHTML = sorted.map(([path, c]) => {
    const name = path.split("/").pop();
    const rc = RISK_COLORS[c.risk];
    return '<div class="file-list-item" onclick="selectFileFromList(\\'' + escJs(path) + '\\')" ' +
      'style="border-left:2px solid ' + rc + '44">' +
      '<span class="fname" title="' + escAttr(path) + '">' + escAttr(name) + '</span>' +
      '<span class="fstats" style="color:' + rc + '">+' + c.added + ' −' + c.removed + '</span></div>';
  }).join("");
}

// ═══════════════════════════════════════════════════════════════
// TREEMAP RENDERING
// ═══════════════════════════════════════════════════════════════

function renderTreemap() {
  const container = document.getElementById("treemap-container");
  const rect = container.getBoundingClientRect();
  const W = Math.max(400, rect.width);
  const H = Math.max(300, rect.height);

  // Remove old SVG
  container.querySelectorAll("svg").forEach(s => s.remove());

  // Build hierarchy from (possibly zoomed) data
  const treeData = zoomNode ? findSubtree(DATA.codebase, zoomNode) : DATA.codebase;
  if (!treeData) { resetZoom(); return; }

  const root = d3.hierarchy(treeData)
    .sum(d => d.size || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  const treemap = d3.treemap()
    .size([W, H])
    .paddingOuter(5)
    .paddingInner(2)
    .paddingTop(22)
    .round(true)
    .tile(d3.treemapResquarify);

  treemap(root);

  const maxMag = Math.max(1, ...Object.values(DATA.changes).map(c => c.added + c.removed));

  const svg = d3.select(container).append("svg")
    .attr("width", W)
    .attr("height", H);

  // Groups (directories)
  const groups = root.descendants().filter(d => d.depth > 0 && d.children);
  for (const node of groups) {
    const w = node.x1 - node.x0;
    const h = node.y1 - node.y0;
    if (w < 3 || h < 3) continue;

    const hasChanges = node.leaves().some(l => DATA.changes[getPath(l)]);

    svg.append("rect")
      .attr("x", node.x0).attr("y", node.y0).attr("width", w).attr("height", h)
      .attr("fill", hasChanges ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)")
      .attr("stroke", hasChanges ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)")
      .attr("stroke-width", hasChanges ? 1.5 : 0.5)
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("click", () => zoomInto(node));

    if (w > 45) {
      svg.append("text")
        .attr("x", node.x0 + 7).attr("y", node.y0 + 14)
        .attr("fill", hasChanges ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.12)")
        .attr("font-size", 10).attr("font-family", "'JetBrains Mono', monospace")
        .attr("font-weight", 600)
        .style("pointer-events", "none")
        .text(node.data.name);
    }
  }

  // Leaves (files)
  const leaves = root.leaves();
  for (const node of leaves) {
    const path = getPath(node);
    const change = DATA.changes[path];
    const w = node.x1 - node.x0;
    const h = node.y1 - node.y0;
    if (w < 2 || h < 2) continue;
    if (!showUnchanged && !change) continue;

    const intensity = change ? Math.min(1, (change.added + change.removed) / (maxMag * 0.6)) : 0;

    let fill;
    if (!change) {
      fill = "rgba(255,255,255,0.03)";
    } else if (viewMode === "risk") {
      const rc = RISK_COLORS[change.risk];
      const alpha = intensity > 0.5 ? "cc" : intensity > 0.25 ? "88" : "44";
      fill = rc + alpha;
    } else {
      if (intensity > 0.7) fill = "rgba(255,45,85," + (0.3 + intensity * 0.6) + ")";
      else if (intensity > 0.4) fill = "rgba(255,107,53," + (0.2 + intensity * 0.5) + ")";
      else if (intensity > 0.15) fill = "rgba(255,184,0," + (0.15 + intensity * 0.4) + ")";
      else fill = "rgba(52,199,89," + (0.1 + intensity * 0.3) + ")";
    }

    const strokeColor = change ? RISK_COLORS[change.risk] + "44" : "rgba(255,255,255,0.03)";

    const fileRect = svg.append("rect")
      .attr("x", node.x0).attr("y", node.y0).attr("width", w).attr("height", h)
      .attr("fill", fill)
      .attr("stroke", strokeColor)
      .attr("stroke-width", 0.5)
      .attr("rx", 3)
      .style("cursor", "pointer")
      .style("transition", "fill 0.2s, stroke 0.15s")
      .on("mouseenter", function() {
        d3.select(this).attr("stroke", "rgba(255,255,255,0.5)").attr("stroke-width", 1.5);
        showTooltip(path, change, intensity);
      })
      .on("mouseleave", function() {
        d3.select(this).attr("stroke", strokeColor).attr("stroke-width", 0.5);
        hideTooltip();
      })
      .on("click", () => selectFile(path));

    // Glow for hot files
    if (change && intensity > 0.5) {
      svg.append("rect")
        .attr("x", node.x0).attr("y", node.y0).attr("width", w).attr("height", h)
        .attr("fill", "none")
        .attr("stroke", RISK_COLORS[change.risk])
        .attr("stroke-width", 1).attr("rx", 3)
        .attr("opacity", 0.3)
        .style("filter", "blur(3px)")
        .style("pointer-events", "none");
    }

    // Labels
    if (w > 50 && h > 16) {
      const maxChars = Math.floor(w / 7);
      const label = node.data.name.length > maxChars
        ? node.data.name.slice(0, maxChars) + "…"
        : node.data.name;

      svg.append("text")
        .attr("x", node.x0 + 4).attr("y", node.y0 + 12)
        .attr("fill", change ? "rgba(255,255,255," + Math.max(0.35, intensity) + ")" : "rgba(255,255,255,0.1)")
        .attr("font-size", Math.min(10, w / 10))
        .attr("font-family", "'JetBrains Mono', monospace")
        .attr("font-weight", change ? 500 : 400)
        .style("pointer-events", "none")
        .text(label);
    }

    if (change && w > 75 && h > 28) {
      svg.append("text")
        .attr("x", node.x0 + 4).attr("y", node.y0 + 23)
        .attr("fill", "rgba(255,255,255,0.25)")
        .attr("font-size", 9)
        .attr("font-family", "'JetBrains Mono', monospace")
        .style("pointer-events", "none")
        .text("+" + change.added + " −" + change.removed);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getPath(node) {
  const parts = [];
  let cur = node;
  while (cur && cur.data.name !== "root") {
    parts.unshift(cur.data.name);
    cur = cur.parent;
  }
  return parts.join("/");
}

function findSubtree(tree, path) {
  const parts = path.split("/");
  let cur = tree;
  for (const part of parts) {
    if (!cur.children) return null;
    cur = cur.children.find(c => c.name === part);
    if (!cur) return null;
  }
  return cur;
}

function showTooltip(path, change, intensity) {
  const t = document.getElementById("tooltip");
  const name = path.split("/").pop();
  document.getElementById("tooltip-name").textContent = name;
  document.getElementById("tooltip-path").textContent = path;

  const stats = document.getElementById("tooltip-stats");
  const risk = document.getElementById("tooltip-risk");

  if (change) {
    stats.innerHTML = '<span class="tooltip-added">+' + change.added + '</span>' +
      '<span class="tooltip-removed">−' + change.removed + '</span>';
    const rc = RISK_COLORS[change.risk];
    risk.innerHTML = '<div class="risk-dot" style="background:' + rc + '"></div>' +
      '<span class="tooltip-risk-label" style="color:' + rc + '">' + change.risk + ' risk</span>' +
      '<span style="font-size:10px;color:#444">·</span>' +
      '<span style="font-size:10px;color:#666">' + (intensity * 100).toFixed(0) + '% heat</span>';
    if (change.reason) {
      risk.innerHTML += '<span style="font-size:10px;color:#444">·</span>' +
        '<span style="font-size:10px;color:#555">' + change.reason + '</span>';
    }
  } else {
    stats.innerHTML = '<span class="tooltip-unchanged">Unchanged</span>';
    risk.innerHTML = '';
  }

  t.classList.add("visible");
}

function hideTooltip() {
  document.getElementById("tooltip").classList.remove("visible");
}

function selectFile(path) {
  selectedFile = path;
  const panel = document.getElementById("detail-panel");
  const content = document.getElementById("detail-content");
  const change = DATA.changes[path];

  const fileName = path.split("/").pop();
  let html = '<div class="detail-filename">' + escHtmlJs(fileName) + '</div>' +
    '<div class="detail-filepath">' + escHtmlJs(path) + '</div>';

  if (change) {
    const mag = change.added + change.removed;
    const churnRatio = change.removed / Math.max(1, change.added);
    const maxMag = Math.max(1, ...Object.values(DATA.changes).map(c => c.added + c.removed));
    const intensity = Math.min(1, mag / (maxMag * 0.6));
    const rc = RISK_COLORS[change.risk];

    html += '<div class="change-bars">' +
      '<div class="change-bar-item"><div class="change-bar-label">Added</div>' +
      '<div class="change-bar-value" style="color:#34c759">+' + change.added.toLocaleString() + '</div></div>' +
      '<div class="change-bar-item"><div class="change-bar-label">Removed</div>' +
      '<div class="change-bar-value" style="color:#ff2d55">−' + change.removed.toLocaleString() + '</div></div></div>';

    html += '<div class="visual-bar">' +
      '<div class="visual-bar-added" style="flex:' + change.added + '"></div>' +
      '<div class="visual-bar-removed" style="flex:' + change.removed + '"></div></div>';

    html += '<div class="metric-row"><span class="metric-label">Risk Level</span>' +
      '<span class="metric-value" style="color:' + rc + '">' + change.risk.toUpperCase() + '</span></div>';
    html += '<div class="metric-row"><span class="metric-label">Heat Intensity</span>' +
      '<span class="metric-value">' + (intensity * 100).toFixed(0) + '%</span></div>';
    html += '<div class="metric-row"><span class="metric-label">Total Magnitude</span>' +
      '<span class="metric-value">' + mag.toLocaleString() + ' lines</span></div>';

    const churnLabel = churnRatio > 0.8 ? "Heavy rewrite" : churnRatio > 0.3 ? "Moderate churn" : "Mostly additions";
    const churnColor = churnRatio > 0.8 ? "#ff6b35" : churnRatio > 0.3 ? "#ffb800" : "#34c759";
    html += '<div class="metric-row"><span class="metric-label">Churn Pattern</span>' +
      '<span class="metric-value" style="color:' + churnColor + '">' + churnLabel + '</span></div>';

    if (change.reason) {
      html += '<div class="metric-row"><span class="metric-label">Risk Reason</span>' +
        '<span class="metric-value" style="color:' + rc + '">' + escHtmlJs(change.reason) + '</span></div>';
    }

    const guidance = change.risk === "critical"
      ? "Line-by-line review required. High magnitude changes to a sensitive area. Check for security implications and verify test coverage."
      : change.risk === "high"
      ? "Careful review recommended. Significant changes that could impact downstream consumers."
      : change.risk === "medium"
      ? "Standard review. Check for consistency and unintended coupling."
      : "Quick scan sufficient. Low-risk change with minimal blast radius.";

    html += '<div class="review-guidance" style="background:' + rc + '0a;border:1px solid ' + rc + '22">' +
      '<div class="review-guidance-title" style="color:' + rc + '">Review Guidance</div>' +
      '<div class="review-guidance-text">' + guidance + '</div></div>';
  } else {
    html += '<div style="font-size:12px;color:#444;padding:20px;text-align:center">No changes in this diff</div>';
  }

  content.innerHTML = html;
  panel.classList.add("visible");
}

function selectFileFromList(path) {
  selectFile(path);
}

function closeDetail() {
  selectedFile = null;
  document.getElementById("detail-panel").classList.remove("visible");
}

function zoomInto(node) {
  const path = getPath(node);
  if (zoomNode === path) {
    // Zoom out one level
    const parts = path.split("/");
    parts.pop();
    zoomNode = parts.length > 0 ? parts.join("/") : null;
  } else {
    zoomNode = path;
  }
  updateZoomIndicator();
  renderTreemap();
}

function resetZoom() {
  zoomNode = null;
  updateZoomIndicator();
  renderTreemap();
}

function updateZoomIndicator() {
  const el = document.getElementById("zoom-indicator");
  if (zoomNode) {
    el.style.display = "block";
    document.getElementById("zoom-path-text").textContent = zoomNode;
  } else {
    el.style.display = "none";
  }
}

function setViewMode(mode) {
  viewMode = mode;
  document.getElementById("btn-heat").className = mode === "heat" ? "btn active" : "btn";
  document.getElementById("btn-risk").className = mode === "risk" ? "btn active" : "btn";
  renderTreemap();
}

function toggleUnchanged() {
  showUnchanged = !showUnchanged;
  document.getElementById("btn-toggle-unchanged").textContent = showUnchanged ? "Hide unchanged" : "Show unchanged";
  document.getElementById("btn-toggle-unchanged").className = showUnchanged ? "btn" : "btn active";
  renderTreemap();
}

function escHtmlJs(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// Start
init();
<\/script>
</body>
</html>`;
}

function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escJs(s) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function escAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeJsonForHTML(obj) {
  // stringify and defensively escape sequences that can break out of script contexts
  return JSON.stringify(obj)
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
