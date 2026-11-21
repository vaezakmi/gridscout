import fs from "fs";
import path from "path";
const ROOT = process.cwd();
const DRY = process.argv.includes("--dry") || !process.argv.includes("--clean");
const YES = process.argv.includes("--yes");
const DELETE_TXT = process.argv.includes("--txt");
const IGNORE_DIRS = new Set(["node_modules","dist",".git",".tmp",".vite",".next","coverage","archive"]);
const KEEP_TXT = new Set(["readme.txt"]);
let JUNK_PATTERNS = [/\.bak$/,/\.old$/,/\.copy$/,/\.backup$/, / - Copy\./, / \(\d+\)\./, /\.tmp$/,/\.log$/];
if (DELETE_TXT) JUNK_PATTERNS.push(/\.txt$/);
let allFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else allFiles.push(full);
  }
}
walk(ROOT);
console.log("\n=== GRID SCOUT CLEANUP ===");
console.log("Root:", ROOT, "| Files:", allFiles.length, "| Mode:", DRY?"DRY":"CLEAN", "| TXT:", DELETE_TXT?"YES":"NO");
let junk = allFiles.filter(f => {
  const base = path.basename(f).toLowerCase();
  if (KEEP_TXT.has(base)) return false;
  return JUNK_PATTERNS.some(rx => rx.test(path.basename(f)));
});
let emptyFiles = allFiles.filter(f => fs.statSync(f).size === 0);
console.log("\n-- JUNK --"); if(!junk.length) console.log("✓ No junk"); else junk.forEach(f => console.log(" ",path.relative(ROOT,f)));
console.log("\n-- EMPTY --"); if(!emptyFiles.length) console.log("✓ No empty"); else emptyFiles.forEach(f => console.log(" ",path.relative(ROOT,f)));
if(DRY){console.log("\n[DRY RUN] Nothing deleted. Run: node scripts/cleanup.mjs --clean --yes --txt")}
else {
  const toDelete=[...new Set([...junk,...emptyFiles])];
  console.log("\nDeleting",toDelete.length,"files...");
  for(const f of toDelete){fs.rmSync(f,{force:true}); console.log(" deleted",path.relative(ROOT,f));}
}
