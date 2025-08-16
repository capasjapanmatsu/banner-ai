#!/usr/bin/env tsx
import { smartTitle } from "../core/text";

console.log("🔤 Smart Title Testing\n");

const testCases = [
  {
    input:
      "【送料無料】高性能ワイヤレスイヤホン ANC機能付き Bluetooth5.3対応 IPX7防水 JAN:4901234567890",
    options: { maxChars: 20, maxLines: 2 },
  },
  {
    input: "超特価！楽天ランキング1位獲得記念セール！今だけ50%OFF！期間限定！",
    options: { maxChars: 16, maxLines: 3 },
  },
  {
    input: "Apple iPhone 15 Pro Max 256GB ナチュラルチタニウム SIMフリー",
    options: { maxChars: 18, maxLines: 2 },
  },
  {
    input: "新商品発売記念・特別価格",
    options: { maxChars: 12, maxLines: 2 },
  },
];

for (const { input, options } of testCases) {
  console.log(`Input: "${input}"`);
  console.log(`Options: ${JSON.stringify(options)}`);
  const result = smartTitle(input, options);
  console.log(`Result:\n${result}`);
  console.log("─".repeat(50));
  console.log("");
}
