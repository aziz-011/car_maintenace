// Inlines the Vite build (JS, CSS, icon) into one standalone HTML file.
import { readFileSync, writeFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const read = (p) => readFileSync(new URL(p.replace(/^\//, ''), dist), 'utf8');

let html = read('index.html');
html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, (_, src) =>
  `<script type="module">${read(src).replace(/<\/script/gi, '<\\/script')}</script>`,
);
html = html.replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/, (_, href) => `<style>${read(href)}</style>`);
html = html.replace(
  /href="\/icon\.svg"/,
  `href="data:image/svg+xml,${encodeURIComponent(read('icon.svg'))}"`,
);

// The installable-app links need a server; the single file has none.
html = html.replace(/\s*<link rel="(manifest|apple-touch-icon)"[^>]*>/g, '');

if (/(src|href)="\/(assets|icon)/.test(html)) throw new Error('Unresolved asset reference left in HTML');
writeFileSync(new URL('../car-maintenance.html', import.meta.url), html);
console.log('Wrote car-maintenance.html');
