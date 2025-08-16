#!/usr/bin/env tsx
import {
  scanAssets,
  findDuplicates,
  removeDuplicates,
  generateStats,
  smartRename,
} from "../core/assets";

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "scan":
      await scanCommand(args);
      break;
    case "duplicates":
      await duplicatesCommand(args);
      break;
    case "clean":
      await cleanCommand(args);
      break;
    case "rename":
      await renameCommand(args);
      break;
    default:
      showHelp();
      break;
  }
}

async function scanCommand(args: string[]) {
  const dirs = args.length > 0 ? args : ["./src/assets", "./public"];
  console.log("🔍 Scanning assets in:", dirs);

  const assets = await scanAssets(dirs);
  const duplicates = findDuplicates(assets);
  const stats = generateStats(assets, duplicates);

  console.log(stats.summary);

  if (duplicates.length > 0) {
    console.log("\n🔄 Duplicate groups:");
    for (const group of duplicates.slice(0, 5)) {
      console.log(
        `\n• Hash: ${group.hash.slice(0, 8)}... (${group.count} files, ${(
          group.totalSize / 1024
        ).toFixed(1)}KB)`
      );
      console.log(`  Keep: ${group.recommended.path}`);
      for (const file of group.files) {
        if (file.path !== group.recommended.path) {
          console.log(`  Remove: ${file.path}`);
        }
      }
    }
    if (duplicates.length > 5) {
      console.log(`\n... and ${duplicates.length - 5} more duplicate groups`);
    }
  }
}

async function duplicatesCommand(args: string[]) {
  const dirs = args.length > 0 ? args : ["./src/assets", "./public"];
  const assets = await scanAssets(dirs);
  const duplicates = findDuplicates(assets);

  if (duplicates.length === 0) {
    console.log("✅ No duplicates found!");
    return;
  }

  console.log(`\n📋 Found ${duplicates.length} duplicate groups:\n`);

  for (const group of duplicates) {
    console.log(
      `🔄 ${group.files[0].basename} (${group.count} copies, ${(
        group.totalSize / 1024
      ).toFixed(1)}KB total)`
    );
    console.log(`   Keep: ${group.recommended.path}`);

    for (const file of group.files) {
      if (file.path !== group.recommended.path) {
        console.log(`   🗑️  ${file.path}`);
      }
    }
    console.log("");
  }
}

async function cleanCommand(args: string[]) {
  const dryRun = !args.includes("--force");
  const dirs = args.filter((arg) => !arg.startsWith("--"));
  const assetDirs = dirs.length > 0 ? dirs : ["./src/assets", "./public"];

  if (dryRun) {
    console.log("🧪 DRY RUN MODE - Use --force to actually remove files");
  }

  const assets = await scanAssets(assetDirs);
  const duplicates = findDuplicates(assets);

  if (duplicates.length === 0) {
    console.log("✅ No duplicates to clean!");
    return;
  }

  const result = await removeDuplicates(duplicates, dryRun);

  console.log(`\n📊 Cleanup Summary:
  • Files ${dryRun ? "would be" : ""} removed: ${result.removed.length}
  • Space ${dryRun ? "would be" : ""} saved: ${(
    result.savedBytes /
    1024 /
    1024
  ).toFixed(2)} MB`);

  if (result.errors.length > 0) {
    console.log("\n❌ Errors:");
    for (const error of result.errors) {
      console.log(`  ${error}`);
    }
  }
}

async function renameCommand(args: string[]) {
  const targetDir =
    args.find((arg) => arg.startsWith("--target="))?.split("=")[1] ||
    "./src/assets/library";
  const dirs = args.filter((arg) => !arg.startsWith("--"));
  const assetDirs = dirs.length > 0 ? dirs : ["./src/assets", "./public"];

  console.log(`🏷️  Renaming assets to: ${targetDir}`);

  const assets = await scanAssets(assetDirs);
  const result = await smartRename(assets, targetDir);

  console.log(`\n📊 Rename Summary:
  • Files processed: ${result.renamedFiles.length}
  • Target directory: ${targetDir}`);

  if (result.errors.length > 0) {
    console.log("\n❌ Errors:");
    for (const error of result.errors) {
      console.log(`  ${error}`);
    }
  }
}

function showHelp() {
  console.log(`
🖼️  Asset Management Tool

Usage:
  npm run assets:scan [dirs...]          - Scan and analyze assets
  npm run assets:duplicates [dirs...]    - Find duplicate files
  npm run assets:clean [dirs...] [--force] - Remove duplicates (dry-run by default)
  npm run assets:rename [dirs...] [--target=dir] - Smart rename with library organization

Examples:
  npm run assets:scan                     - Scan default directories
  npm run assets:scan ./public ./custom  - Scan specific directories
  npm run assets:duplicates              - Show duplicate files
  npm run assets:clean --force           - Actually remove duplicates
  npm run assets:rename --target=./lib   - Rename to custom directory

Options:
  --force    - Actually perform destructive operations
  --target   - Specify target directory for rename operation
`);
}

main().catch(console.error);
