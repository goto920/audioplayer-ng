import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const now = new Date();
const jstParts = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
}).formatToParts(now);

const getPart = (type: string) => jstParts.find(p => p.type === type)?.value || '';
const buildVersion = `v${getPart('year')}${getPart('month')}${getPart('day')}-${getPart('hour')}${getPart('minute')}`;

export default defineConfig({
  base: './',
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  build: {
    chunkSizeWarningLimit: 1000, // オーディオ/Wasmエンジン用に1MBまで警告を抑える
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate', // 新しいビルドが来たらバックグラウンドで自動更新
      includeAssets: ['favicon.svg'],
      workbox: {
        // ★ JS/CSS/HTML だけでなく Wasm や画像もすべて端末に強制保存
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
      },
      manifest: {
        name: 'Audio Player NG',
        short_name: 'AudioPlayerNG',
        description: 'Key & Tempo Changer for Drum & Music Practice',
        theme_color: '#0f172a',      // 背景に合わせたダークトーン (Slate-900)
        background_color: '#0f172a',
        display: 'standalone',        // ★ ブラウザのアドレスバーを消して全画面アプリ化
        orientation: 'any',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
