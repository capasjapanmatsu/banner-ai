"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";

interface SavedLogo {
  id: string;
  name: string;
  url: string;
  created_at: string;
}

interface LogoLibraryProps {
  user: any;
  onLogoSelect: (logoUrl: string, logoName: string) => void;
}

export default function LogoLibrary({ user, onLogoSelect }: LogoLibraryProps) {
  const [savedLogos, setSavedLogos] = useState<SavedLogo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 保存されたロゴを読み込み
  useEffect(() => {
    if (user) {
      loadSavedLogos();
    }
  }, [user]);

  const loadSavedLogos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_logos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading logos:', error);
        return;
      }

      setSavedLogos(data || []);
    } catch (error) {
      console.error('Error loading logos:', error);
    }
  };

  const uploadLogo = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    setIsUploading(true);
    try {
      // ファイル名を生成
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Supabase Storageにアップロード
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-logos')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      // 公開URLを取得
      const { data: urlData } = supabase.storage
        .from('user-logos')
        .getPublicUrl(fileName);

      // データベースに保存
      const { data: logoData, error: dbError } = await supabase
        .from('user_logos')
        .insert({
          user_id: user.id,
          name: file.name,
          url: urlData.publicUrl,
          file_path: fileName
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      // ローカル状態を更新
      setSavedLogos(prev => [logoData, ...prev]);
      
      // 自動選択
      onLogoSelect(urlData.publicUrl, file.name);

    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('ロゴのアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteLogo = async (logo: SavedLogo) => {
    if (!user) return;
    if (!confirm(`${logo.name}を削除しますか？`)) return;

    try {
      // Storageから削除
      const { error: storageError } = await supabase.storage
        .from('user-logos')
        .remove([logo.url.split('/').pop() || '']);

      if (storageError) {
        console.warn('Storage deletion warning:', storageError);
      }

      // データベースから削除
      const { error: dbError } = await supabase
        .from('user_logos')
        .delete()
        .eq('id', logo.id);

      if (dbError) {
        throw dbError;
      }

      // ローカル状態を更新
      setSavedLogos(prev => prev.filter(l => l.id !== logo.id));

    } catch (error) {
      console.error('Error deleting logo:', error);
      alert('ロゴの削除に失敗しました');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      uploadLogo(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      uploadLogo(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  if (!user) {
    return (
      <div className="p-3 border rounded-lg bg-gray-50">
        <div className="text-sm text-gray-600 text-center">
          ログインするとロゴを保存・管理できます
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">保存済みロゴ</h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isUploading ? '保存中...' : '新規追加'}
        </button>
      </div>

      {/* ロゴアップロード領域 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-3 transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <div className="text-center">
          <div className="text-xs text-gray-600 mb-1">ここにロゴをドロップ</div>
          <div className="text-xs text-gray-500">または上の「新規追加」ボタンをクリック</div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 保存済みロゴ一覧 */}
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {savedLogos.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-2">
            まだロゴが保存されていません
          </div>
        ) : (
          savedLogos.map((logo) => (
            <div
              key={logo.id}
              className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 group"
            >
              <Image
                src={logo.url}
                alt={logo.name}
                width={32}
                height={32}
                className="w-8 h-8 object-contain rounded border"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-900 truncate">
                  {logo.name}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(logo.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onLogoSelect(logo.url, logo.name)}
                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  title="バナーに追加"
                >
                  使用
                </button>
                <button
                  onClick={() => deleteLogo(logo)}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  title="削除"
                >
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
