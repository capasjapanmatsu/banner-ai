"use client";

import { useEffect, useRef, useState } from "react";
import type { BannerSpec } from "@/types/banner";
import type { AssistantDecision, DesignBrief, AssistantQuestion, Audience } from "@/types/assistant";

type Props = {
  onGenerate: (proposal: BannerSpec) => void;
  currentSpec: BannerSpec;
  audience: Audience;
};

export default function ChatPanel({ onGenerate, currentSpec, audience }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  // 複数スクショ添付（ドラッグ&ドロップ／ペースト／ファイル選択）
  const [attachments, setAttachments] = useState<string[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);

  // アシスタントの質疑応答
  const [questions, setQuestions] = useState<AssistantQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Partial<DesignBrief>>({});

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDragOver = (e: DragEvent) => { e.preventDefault(); el.classList.add("ring-2","ring-blue-400"); };
    const onDragLeave = () => el.classList.remove("ring-2","ring-blue-400");
    const onDrop = async (e: DragEvent) => {
      e.preventDefault(); el.classList.remove("ring-2","ring-blue-400");
      const files = Array.from(e.dataTransfer?.files ?? []).filter(f => f.type.startsWith("image/"));
      for (const f of files) {
        const url = await fileToDataURL(f);
        setAttachments(prev => [...prev, url]);
      }
    };
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  const onPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    for (const it of items) {
      if (it.kind === "file") {
        const f = it.getAsFile(); if (!f) continue;
        if (f.type.startsWith("image/")) {
          const url = await fileToDataURL(f);
          setAttachments(prev => [...prev, url]);
        }
      }
    }
  };

  const handleFilePick = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (f.type.startsWith("image/")) {
        const url = await fileToDataURL(f);
        setAttachments(prev => [...prev, url]);
      }
    }
  };

  const extractUrls = (text: string) => {
    const re = /(https?:\/\/[^\s]+)/g;
    return Array.from(text.matchAll(re)).map(m => m[1]);
  };

  const buildInitialBrief = (): Partial<DesignBrief> => ({
    platform: currentSpec.meta.platform as any,
    size: currentSpec.meta.size,
    audience,
    discount: prompt.match(/\d+% ?OFF/i)?.[0]?.toUpperCase(),
    deadline: (prompt.includes("本日") || prompt.includes("今日")) ? "本日23:59まで" : undefined,
    tone: (prompt.match(/(可愛い|カワイイ|キュート)/) ? "cute" :
           prompt.match(/(かっこいい|クール)/) ? "cool" :
           prompt.match(/(上品|高級)/) ? "luxury" :
           prompt.match(/(シンプル|最小)/) ? "simple" : undefined) as any,
    sampleUrls: extractUrls(prompt),
    sampleImages: attachments,
  });

  const callAssistant = async (brief: Partial<DesignBrief>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const decision = (await res.json()) as AssistantDecision;

      if (decision.status === "need_info") {
        setQuestions(decision.questions);
        setAnswers(prev => ({ ...brief, ...prev }));
      } else {
        setQuestions(null);
        setAnswers({});
        onGenerate(decision.proposals[0]);
      }
    } catch (e) {
      console.error(e);
      alert("アシスタント処理に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const brief = buildInitialBrief();
    await callAssistant(brief);
  };

  const handleAnswerSubmit = async () => {
    const merged: Partial<DesignBrief> = {
      ...answers,
      platform: currentSpec.meta.platform as any,
      size: currentSpec.meta.size,
      audience,
      sampleImages: attachments,
      sampleUrls: extractUrls(prompt),
    };
    await callAssistant(merged);
  };

  return (
    <div className="border rounded-2xl p-3 space-y-3">
      <div className="text-sm font-medium">チャット指示 / スクショやURLもOK</div>

      <div ref={dropRef} className="border rounded p-2">
        <textarea
          className="w-full border rounded p-2 text-sm min-h-32 resize-y"
          rows={8}
          placeholder={`例：女性向け／青基調／このスクショみたいに太字で、CTAは右下／「本日23:59まで 最大20%OFF」\nURLも貼れます→ https://example.com/ref`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onPaste={onPaste}
        />
        <div className="flex items-center gap-2 mt-2">
          <label className="px-3 py-1.5 rounded border cursor-pointer">
            スクショを追加（複数可）
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e)=>handleFilePick(e.target.files)} />
          </label>
          <span className="text-xs text-gray-500">ここにドラッグ&ドロップも可</span>
        </div>
        {attachments.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {attachments.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="添付画像" className="h-14 w-14 object-cover rounded border" />
              </div>
            ))}
          </div>
        )}
      </div>

      {!questions && (
        <button
          onClick={handleSend}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {loading ? "考え中..." : "アシスタントに任せる"}
        </button>
      )}

      {questions && (
        <div className="mt-2 space-y-2">
          <div className="text-sm font-medium">不足情報があります。教えてください：</div>
          {questions.map(q => (
            <div key={q.id} className="flex flex-col gap-1">
              <label className="text-sm">{q.text}{q.required ? " *" : ""}</label>
              {q.choices ? (
                <select
                  className="border rounded px-2 py-1"
                  onChange={(e)=>setAnswers(prev=>({...prev,[q.field]: e.target.value}))}
                  defaultValue=""
                >
                  <option value="" disabled>選択してください</option>
                  {q.choices.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input
                  className="border rounded px-2 py-1"
                  placeholder={q.placeholder}
                  onChange={(e)=>setAnswers(prev=>({...prev,[q.field]: e.target.value}))}
                />
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <button
              onClick={handleAnswerSubmit}
              disabled={loading}
              className="px-3 py-1.5 rounded bg-black text-white disabled:opacity-50"
            >
              回答を送る
            </button>
            <button
              onClick={()=>{ setQuestions(null); setAnswers({}); }}
              className="px-3 py-1.5 rounded border"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

async function fileToDataURL(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const blob = new Blob([buf], { type: file.type });
  return await new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(blob);
  });
}
