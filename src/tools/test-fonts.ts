#!/usr/bin/env tsx
import { initializeFonts, getFontConfig, selectBestFont } from "../core/fonts";

console.log("🔤 Font System Testing\n");

console.log("1. Initializing font system...");
const fontInfo = initializeFonts();

console.log("\n2. Testing font configurations...");
const configs = [
  "japanese",
  "japanese-bold",
  "english",
  "english-bold",
  "display",
];

for (const configName of configs) {
  const config = getFontConfig(configName as any);
  const selectedFont = selectBestFont(config);
  console.log(`${configName}: ${selectedFont}`);
}

console.log("\n3. Available font families:");
console.log(fontInfo.availableFamilies.slice(0, 10).join(", "));
if (fontInfo.availableFamilies.length > 10) {
  console.log(`... and ${fontInfo.availableFamilies.length - 10} more`);
}
