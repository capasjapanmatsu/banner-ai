// チャット学習機能の統合例
// lib/chat-integration.ts

import { buildPromptForChat } from "../src/chat/run";

/**
 * 既存のLLM呼び出しを学習機能付きに拡張
 * @param tenantId テナントID（店舗識別子）
 * @param userMessage ユーザーからの入力
 * @param existingLLMCall 既存のLLM呼び出し関数
 */
export async function callLLMWithLearning<T>(
  tenantId: string,
  userMessage: string,
  existingLLMCall: (params: { system: string; user: string }) => Promise<T>
): Promise<T> {
  // 学習済みプロンプトを生成
  const { system, user } = buildPromptForChat(tenantId, userMessage);

  // 既存のLLM呼び出しに学習済みプロンプトを適用
  return await existingLLMCall({ system, user });
}

/**
 * アシスタントAPIで使用する場合の例
 */
export async function enhancedAssistantCall(
  tenantId: string,
  userQuery: string,
  brief: any
) {
  // 学習機能を使ってプロンプトを構築
  const { system, user } = buildPromptForChat(tenantId, userQuery);

  // 既存のdecide関数を呼び出す前に、学習済みのコンテキストを使用
  const enhancedBrief = {
    ...brief,
    systemPrompt: system,
    userContext: user,
  };

  return enhancedBrief;
}
