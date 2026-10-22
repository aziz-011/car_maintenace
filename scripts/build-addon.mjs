// Copies the built app into the Home Assistant add-on folder, so the add-on
// image needs no build step on the device. Run after `npm run build`.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const app = new URL('car_maintenance/app/', root);
for (const p of ['dist/index.html', 'dist-server/server.mjs']) {
  if (!existsSync(new URL(p, root))) throw new Error(`${p} is missing: run npm run build first`);
}
rmSync(app, { recursive: true, force: true });
mkdirSync(new URL('dist-server/', app), { recursive: true });
cpSync(new URL('dist/', root), new URL('dist/', app), { recursive: true });
cpSync(new URL('dist-server/server.mjs', root), new URL('dist-server/server.mjs', app));
console.log('Wrote car_maintenance/app/ (remember to raise the version in car_maintenance/config.yaml)');
