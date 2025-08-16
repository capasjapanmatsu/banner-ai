"use client";

import { useState, useRef, useEffect } from "react";
import { BannerSpec, UploadedFile, ExtractResult, PresetConfig } from "@/types/banner";
import { PRESET_CONFIGS, createDefaultSpec } from "@/lib/spec-presets";
import { computeDeltas, applyProfileUpdate, warmStartSpec } from "@/lib/learning";
import UploadPanel from "@/components/UploadPanel";
import ChatPanel from "@/components/ChatPanel";
import BannerRenderer from "@/components/BannerRenderer";
import EffectsPanel from "@/components/EffectsPanel";
import LogoLibrary from "@/components/LogoLibrary";
import { uid } from "@/lib/id";
import { supabase } from "@/lib/supabase/client";
import { analytics as commonAnalytics } from "@/src/analytics/track";
import type { BackgroundEffect } from "@/types/banner";

export default function Home() {
  const [selectedPreset, setSelectedPreset] = useState<PresetConfig>(PRESET_CONFIGS[0]);
  const [spec, setSpec] = useState<BannerSpec>(createDefaultSpec(PRESET_CONFIGS[0]));
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [extractResult, setExtractResult] = useState<ExtractResult>();
  
  // 選択中レイヤーの管理
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  // カスタムサイズ入力
  const [wInput, setWInput] = useState(spec.meta.size.w);
  const [hInput, setHInput] = useState(spec.meta.size.h);
  
  // 認証状態
  const [user, setUser] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [mounted, setMounted] = useState(false);
  
  // 出品画像モード関連のstate
  const [mode, setMode] = useState<"banner" | "product">("banner");
  const [productImageData, setProductImageData] = useState<{
    originalUrl: string;
    processedUrl: string;
    backgroundRemoved: boolean;
    backgroundEffect?: BackgroundEffect;
  } | null>(null);
  
  // 学習機能のstate
  const proposalRef = useRef<BannerSpec | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>({});
  const [audience, setAudience] = useState<'women' | 'men' | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);

  // 初期読み込み時にローカルストレージからプロファイルを読み込み
  useEffect(() => {
    const savedProfile = localStorage.getItem('profile:demo-account');
    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile);
        setProfile(parsedProfile);
      } catch (error) {
        console.error('Failed to parse saved profile:', error);
      }
    }
  }, []);

  // プリセット変更時にカスタムサイズ入力値を同期
  useEffect(() => {
    setWInput(spec.meta.size.w);
    setHInput(spec.meta.size.h);
  }, [spec.meta.size.w, spec.meta.size.h]);

  // 認証状態の監視
  useEffect(() => {
    setMounted(true);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN') {
        setShowLoginModal(false);
      }
    });

    // 初期認証状態の取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // プラットフォーム別サイズ制限マップ
  const sizeLimitMap = {
    rakuten: 800_000,  // 800KB
    yahoo: 1_000_000,  // 1MB
    custom: 900_000,   // 900KB
  };

  const handlePresetChange = (preset: PresetConfig) => {
    setSelectedPreset(preset);
    const key = preset.platform;
    const size = preset.size;
    
    // プリセット選択をトラッキング
    commonAnalytics.trackAssetAdopted(
      'demo-user', 
      preset.name, 
      'preset',
      undefined,
      undefined,
      ['user_selection']
    );
    
    setSpec(prev => ({
      ...prev,
      meta: { ...prev.meta, platform: key === "rakuten" ? "rakuten" : key === "yahoo" ? "yahoo" : "custom", size },
      export: { ...(prev.export ?? {}), maxBytes: sizeLimitMap[key] ?? 900_000, format: "png", quality: 0.92 }
    }));
  };

  // 認証関連ハンドラ
  const handleLogin = async () => {
    if (!emailInput.trim()) return;
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.trim(),
        options: {
          // Magic linkの場合はこちら
          // shouldCreateUser: true
        }
      });
      
      if (error) {
        alert(`ログインエラー: ${error.message}`);
      } else {
        alert('認証メールを送信しました。メールをご確認ください。');
        setEmailInput('');
      }
    } catch (error) {
      alert('ログインに失敗しました');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
        }
      });
      
      if (error) {
        alert(`Googleログインエラー: ${error.message}`);
      }
    } catch (error) {
      alert('Googleログインに失敗しました');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleLogoDrop = (logoUrl: string, logoName: string) => {
    const newSpec = { ...spec };
    const existingLogoLayer = newSpec.layers.find(layer => layer.type === "logo");
    
    if (existingLogoLayer && existingLogoLayer.type === "logo") {
      existingLogoLayer.src = logoUrl;
    } else {
      newSpec.layers.push({
        id: "saved-logo",
        type: "logo",
        src: logoUrl,
        x: 20,
        y: 20,
        w: 80,
        h: 40,
        opacity: 1,
      });
    }
    setSpec(newSpec);
    setSelectedLayerId("saved-logo");
  };

  const handleFileUpload = (file: File, type: "reference" | "product" | "logo") => {
    const url = URL.createObjectURL(file);
    const uploadedFile: UploadedFile = { file, url, type };
    
    setUploadedFiles(prev => [
      ...prev.filter(f => f.type !== type),
      uploadedFile
    ]);

    // 商品画像がアップロードされた場合、バナーに追加
    if (type === "product") {
      const newSpec = { ...spec };
      const existingImageLayer = newSpec.layers.find(layer => layer.type === "image");
      
      if (existingImageLayer && existingImageLayer.type === "image") {
        existingImageLayer.src = url;
      } else {
        newSpec.layers.push({
          id: "product-image",
          type: "image",
          src: url,
          x: 200,
          y: 200,
          w: 200,
          h: 200,
          opacity: 1,
        });
      }
      setSpec(newSpec);
    }

    // ロゴがアップロードされた場合、バナーに追加
    if (type === "logo") {
      const newSpec = { ...spec };
      const existingLogoLayer = newSpec.layers.find(layer => layer.type === "logo");
      
      if (existingLogoLayer && existingLogoLayer.type === "logo") {
        existingLogoLayer.src = url;
      } else {
        newSpec.layers.push({
          id: "logo",
          type: "logo",
          src: url,
          x: 20,
          y: 20,
          w: 80,
          h: 40,
          opacity: 1,
        });
      }
      setSpec(newSpec);
    }
  };

  const handleExtractResult = (result: ExtractResult) => {
    setExtractResult(result);
    
    // 抽出された色をpaletteに反映
    if (result.colors.length >= 2) {
      const newSpec = { ...spec };
      newSpec.palette.primary = result.colors[0]; // 1番目の色をプライマリに
      newSpec.palette.accent = result.colors[1];  // 2番目の色をアクセントに
      if (result.colors.length >= 3) {
        newSpec.palette.bg = result.colors[2];    // 3番目の色を背景に
      }
      setSpec(newSpec);
    }
  };

  const handleSpecUpdate = (newSpec: BannerSpec) => {
    // /api/plan のレスポンスを受けた直後の処理
    proposalRef.current = newSpec;
    const warmed = warmStartSpec(newSpec, profile, audience || undefined);
    setSpec(warmed);
  };

  const handleAdoptLearning = async () => {
    const before = proposalRef.current ?? spec;
    const after = spec;
    const deltas = computeDeltas(before, after);
    const newProfile = applyProfileUpdate(profile, deltas, audience ?? undefined);
    
    setProfile(newProfile);
    localStorage.setItem('profile:demo-account', JSON.stringify(newProfile));
    
    // Supabaseにフィードバックデータを送信（ログイン済みの場合）
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: 'demo-account',
          userId: user?.id, // ログイン済みの場合のみuser_idを送信
          audience,
          specBefore: proposalRef.current,
          specAfter: spec,
          deltas,
          event: 'approve'
        })
      });

      const result = await response.json();
      if (!result.ok) {
        console.error('Failed to send feedback:', result.error);
        // エラーでもローカル学習は継続
      } else if (user?.id) {
        console.log('Feedback saved to Supabase');
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
      // エラーでもローカル学習は継続
    }
    
    // トースト表示
    const message = user?.id 
      ? '学習しました！クラウドにも保存されました' 
      : '学習しました！次回の初期案に反映されます';
    setShowToast(message);
    setTimeout(() => setShowToast(null), 3000);
  };

  // 学習リセット機能
  const handleResetLearning = () => {
    localStorage.removeItem('profile:demo-account');
    setProfile({});
    setShowToast('学習データをリセットしました');
    setTimeout(() => setShowToast(null), 3000);
  };

  // トーストコンポーネント
  const Toast = ({ message }: { message: string }) => (
    <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
      {message}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* トースト表示 */}
      {showToast && <Toast message={showToast} />}

      {/* ログインモーダル */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">ログイン</h2>
            <div className="space-y-4">
              {/* Googleログインボタン */}
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Googleでログイン
              </button>
              
              {/* 区切り線 */}
              <div className="flex items-center gap-3">
                <hr className="flex-1" />
                <span className="text-sm text-gray-500">または</span>
                <hr className="flex-1" />
              </div>
              
              {/* メールログイン */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your-email@example.com"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleLogin}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  認証メール送信
                </button>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-full px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ShopDesigner AI</h1>
              <p className="text-sm text-gray-600">日本のネットショッピング向けバナー生成ツール</p>
            </div>
            
            {/* 学習機能コントロール */}
            <div className="flex items-center gap-4">
              {/* 認証状態表示・ログイン/ログアウト */}
              <div className="flex items-center gap-3">
                {mounted && user ? (
                  <>
                    <span className="text-sm text-gray-600">
                      {user.email}
                    </span>
                    <a
                      href="/settings/profile"
                      className="px-3 py-1 text-blue-600 border border-blue-300 rounded text-sm hover:bg-blue-50"
                    >
                      設定
                    </a>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                    >
                      ログアウト
                    </button>
                  </>
                ) : mounted ? (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    ログイン
                  </button>
                ) : null}
              </div>

              {/* オーディエンス選択 */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">対象:</label>
                <select
                  value={audience || ''}
                  onChange={(e) => setAudience(e.target.value === '' ? null : e.target.value as 'women' | 'men')}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">未選択</option>
                  <option value="women">女性向け</option>
                  <option value="men">男性向け</option>
                </select>
              </div>

              {/* 採用（学習）ボタン */}
              <button
                onClick={handleAdoptLearning}
                disabled={!proposalRef.current}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                採用（学習）
              </button>

              {/* 学習リセットボタン */}
              <button
                onClick={handleResetLearning}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                学習リセット
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* 左ペイン */}
        <div className="w-[360px] bg-white border-r flex flex-col">
          {/* ロゴライブラリ */}
          <div className="p-4 border-b">
            <LogoLibrary 
              user={user} 
              onLogoSelect={handleLogoDrop}
            />
          </div>

          {/* プリセット選択 */}
          <div className="p-4 border-b">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              プリセット選択
            </label>
            <select
              value={selectedPreset.platform}
              onChange={(e) => {
                const preset = PRESET_CONFIGS.find(p => p.platform === e.target.value);
                if (preset) handlePresetChange(preset);
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
            >
              {PRESET_CONFIGS.map((config) => (
                <option key={config.platform} value={config.platform}>
                  {config.name}
                </option>
              ))}
            </select>
            
            {/* カスタムサイズ */}
            <div className="mt-3">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                カスタムサイズ
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                  value={wInput}
                  onChange={(e) => setWInput(Number(e.target.value))}
                  placeholder="幅"
                />
                <span className="text-sm text-gray-500">×</span>
                <input
                  type="number"
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                  value={hInput}
                  onChange={(e) => setHInput(Number(e.target.value))}
                  placeholder="高さ"
                />
                <button
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  onClick={() => {
                    if (!wInput || !hInput) return;
                    setSpec(prev => ({ 
                      ...prev, 
                      meta: { ...prev.meta, size: { w: wInput, h: hInput } } 
                    }));
                  }}
                >
                  適用
                </button>
              </div>
            </div>
          </div>

          {/* ファイルアップロード */}
          <div className="flex-1 overflow-y-auto">
            <UploadPanel
              files={uploadedFiles}
              onFileUpload={handleFileUpload}
              onExtractResult={handleExtractResult}
              mode={mode}
              onModeChange={(newMode) => {
                setMode(newMode);
                // モード変更時にBannerSpecのmodeも更新
                setSpec(prev => ({
                  ...prev,
                  meta: { ...prev.meta, mode: newMode }
                }));
              }}
              onProductImageProcessed={setProductImageData}
              onImageEffectChange={(type, effect) => {
                // 画像エフェクトをBannerSpecに適用
                setSpec(prev => ({
                  ...prev,
                  layers: prev.layers.map(layer => {
                    if (layer.type === 'image' && 
                        ((type === 'product' && layer.src === uploadedFiles.find(f => f.type === 'product')?.url) ||
                         (type === 'reference' && layer.src === uploadedFiles.find(f => f.type === 'reference')?.url) ||
                         (type === 'logo' && layer.src === uploadedFiles.find(f => f.type === 'logo')?.url))) {
                      return { ...layer, effects: effect || undefined };
                    }
                    return layer;
                  })
                }));
              }}
            />
          </div>

          {/* チャットパネル */}
          <ChatPanel
            currentSpec={spec}
            onGenerate={(proposal) => {
              // AIアシスタントからの提案を適用
              setSpec(proposal);
              proposalRef.current = proposal;
            }}
            audience={audience}
          />

          {/* エフェクトパネル */}
          <EffectsPanel spec={spec} onChange={(next) => setSpec(next)} />
        </div>

        {/* 右ペイン */}
        <div className="flex-1 p-8 overflow-y-auto">
          <BannerRenderer 
            spec={spec} 
            onChange={(next) => setSpec(next)}
            selectedLayerId={selectedLayerId}
            onSelectLayer={(id) => setSelectedLayerId(id)}
          />
        </div>
      </div>
    </div>
  );
}
