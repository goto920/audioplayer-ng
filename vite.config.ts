import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 日本時間 (JST) でのビルド日時フォーマット: YYYYMMDD-HHmm
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
  plugins: [
    react(),
    tailwindcss(),
  ],
})
