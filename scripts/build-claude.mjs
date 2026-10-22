// Builds the claude.ai version: the page content (title, styles, app) without
// the <html>/<head>/<body> wrapper, which claude.ai adds when publishing.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const read = (p) => readFileSync(new URL(p.replace(/^\.?\//, ''), dist), 'utf8');
const index = read('index.html');
const js = read(index.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/)[1]);
const css = read(index.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/)[1]);

const page = `<title>Car Maintenance</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>
`;

mkdirSync(new URL('../dist-claude/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist-claude/car-maintenance.html', import.meta.url), page);
console.log('Wrote dist-claude/car-maintenance.html');
