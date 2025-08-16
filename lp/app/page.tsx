export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">ShopDesigner AI</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">機能</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">料金</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900">会社概要</a>
            </nav>
            <div className="flex items-center space-x-4">
              <a 
                href="https://app.shopdesignerai.com" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                アプリを開く
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            AIが作る、
            <span className="text-blue-600">売上が上がる</span>
            バナーデザイン
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            店舗の商品写真をアップロードするだけで、AIが最適なバナーデザインを自動生成。
            A/Bテストや学習機能で、継続的に成果を向上させます。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/signup/intake" 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              無料で始める
            </a>
            <a 
              href="#demo" 
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              デモを見る
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              なぜShopDesigner AIを選ぶのか
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              従来のデザインツールとは一線を画す、AI駆動の革新的な機能
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI自動生成</h3>
              <p className="text-gray-600">
                商品画像をアップロードするだけで、AIが最適なレイアウト、色合い、フォントを選択して高品質なバナーを自動生成
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">学習機能</h3>
              <p className="text-gray-600">
                ユーザーの選択や成果データを学習し、継続的にデザイン品質を向上。使うほど賢くなるAI
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">高速生成</h3>
              <p className="text-gray-600">
                従来のデザイン作業に必要な数時間を、わずか数分に短縮。効率的な制作フローを実現
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            今すぐ始めて、売上向上を実感しませんか？
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            無料トライアルで、AIの力を体験してください
          </p>
          <a 
            href="/signup/intake" 
            className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-block"
          >
            無料で始める
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">ShopDesigner AI</h3>
              <p className="text-gray-400">
                AI駆動の店舗デザインソリューション
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">製品</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white">機能</a></li>
                <li><a href="#pricing" className="hover:text-white">料金</a></li>
                <li><a href="https://app.shopdesignerai.com" className="hover:text-white">アプリ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">サポート</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/help" className="hover:text-white">ヘルプ</a></li>
                <li><a href="/contact" className="hover:text-white">お問い合わせ</a></li>
                <li><a href="/privacy" className="hover:text-white">プライバシーポリシー</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">会社</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/about" className="hover:text-white">会社概要</a></li>
                <li><a href="/news" className="hover:text-white">ニュース</a></li>
                <li><a href="/careers" className="hover:text-white">採用情報</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 ShopDesigner AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
