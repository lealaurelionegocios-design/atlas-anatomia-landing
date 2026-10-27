/**
 * Test end-to-end (facoltativo) sull'app compilata.
 * Requisiti: `npm run build` e Playwright con Chromium (npm i -D playwright && npx playwright install chromium).
 * Uso: npm run test:e2e
 */
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const assert = (c, msg) => { if (!c) throw new Error('FAIL: ' + msg); console.log('ok -', msg); };
(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, 'serve-static.cjs'), path.join(__dirname, '..', 'out')], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 800));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const U = 'http://localhost:4173';
  // attende la fine del salvataggio locale prima di ricaricare la pagina
  const saved = () => p.waitForFunction(() => !document.body.innerText.includes('Salvataggio'));
  const N = (s) => s.replace(/\u00a0|\u202f/g, ' ');
  const txt = async () => N(await p.locator('main').innerText());

  await p.goto(U + '/ingredienti/'); await p.waitForSelector('text=Farina 00');
  assert((await txt()).includes('0,0018 €/g'), 'demo farina cost per gram');

  // 1. nuovo ingrediente
  await p.click('main >> text=Nuovo ingrediente');
  await p.fill('#ing-name', 'Pistacchi');
  await p.fill('#ing-qty', '1'); await p.selectOption('#ing-unit', 'kg'); await p.fill('#ing-price', '28');
  assert(N(await p.locator('[role=dialog]').innerText()).includes('0,0280 €/g'), 'live preview 28€/kg = 0,0280 €/g');
  await p.click('[role=dialog] button[type=submit]');
  await p.waitForSelector('[role=dialog]', { state: 'detached' });
  assert((await txt()).includes('Pistacchi'), 'ingredient added');

  // validation
  await p.click('main >> text=Nuovo ingrediente');
  await p.click('[role=dialog] button[type=submit]');
  assert(await p.locator('[role=dialog] [role=alert]').count() >= 2, 'validation errors shown for empty form');
  await p.keyboard.press('Escape');

  // 2. variazione prezzo farina
  await p.click('main table >> text=Farina 00');
  await p.fill('#ing-price', '2,40');
  assert((await p.locator('[role=dialog]').innerText()).includes('storico'), 'history note shown');
  await p.click('[role=dialog] button[type=submit]');
  await saved();
  await p.goto(U + '/ricette/'); await p.waitForSelector('text=Torta alle Fragole');
  const torta = N(await p.locator('li', { hasText: 'Torta alle Fragole' }).innerText());
  assert(torta.includes('2,52 €'), 'torta unit cost recalculated 2,51 → 2,52');

  // 3. nuova ricetta
  await p.goto(U + '/ricette/modifica/'); await p.waitForSelector('#r-name');
  await p.fill('#r-name', 'Biscotti al pistacchio');
  await p.fill('#r-yield', '4'); await p.fill('#r-yunit', 'pezzi');
  const firstSel = p.locator('select[id^="l-ing-"]').first();
  await firstSel.selectOption({ label: 'Pistacchi' });
  await p.locator('input[id^="l-q-"]').first().fill('100');
  await p.fill('#r-lmin', '0');
  await p.waitForTimeout(200);
  const aside = N(await p.locator('aside').last().innerText());
  assert(aside.includes('0,70 €'), 'editor live unit cost 2,80/4 = 0,70');
  await p.click('aside >> text=Salva ricetta');
  await p.waitForURL('**/ricette/');
  assert((await txt()).includes('Biscotti al pistacchio'), 'recipe saved');

  // 4. calcolatore
  const card = p.locator('li', { hasText: 'Biscotti al pistacchio' });
  await card.locator('text=Calcola prezzo').click();
  await p.waitForSelector('#c-margin');
  await p.fill('#c-margin', '50'); await p.selectOption('#c-step', '1');
  await p.waitForTimeout(200);
  assert((await txt()).includes('1,40 €'), 'price = 0,70 / (1-0,5) = 1,40');
  await p.fill('#c-fees', '60');
  assert((await txt()).includes('100%'), 'percent sum error shown');
  await p.fill('#c-fees', '0');

  // 5. persistenza
  await saved();
  await p.reload(); await p.waitForSelector('#c-margin');
  await p.goto(U + '/ricette/'); await p.waitForSelector('text=Biscotti al pistacchio');
  assert(true, 'data persisted after reload');

  // 6. eliminazione bloccata
  await p.goto(U + '/ingredienti/'); await p.waitForSelector('text=Uova fresche');
  await p.locator('tr', { hasText: 'Uova fresche' }).locator('button[aria-label^="Elimina"]').click();
  assert((await p.locator('[role=dialog]').innerText()).includes('Ingrediente in uso'), 'delete blocked for used ingredient');
  await p.keyboard.press('Escape');

  // 7. backup → elimina tutto → ripristino
  await p.goto(U + '/impostazioni/'); await p.waitForSelector('text=Scarica backup');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=Scarica backup (JSON)')]);
  const file = path.join(os.tmpdir(), 'sweetprofit-e2e-backup.json'); await dl.saveAs(file);
  await p.click('text=Elimina tutti i dati');
  const confirmBtn = p.locator('[role=dialog] button', { hasText: 'Elimina tutti i dati' });
  assert(await confirmBtn.isDisabled(), 'wipe disabled until typed');
  await p.fill('[role=dialog] input', 'ELIMINA'); await confirmBtn.click();
  await p.waitForTimeout(1500);
  await p.goto(U + '/ricette/'); await p.waitForSelector('text=Nessuna ricetta');
  assert(true, 'all data wiped (no demo reload)');
  await p.goto(U + '/impostazioni/'); await p.waitForSelector('text=Ripristina da backup');
  await p.setInputFiles('input[type=file]', file);
  await p.waitForSelector('text=Ripristinare questo backup?');
  await p.click('[role=dialog] >> text=Sostituisci i dati');
  await p.waitForTimeout(1500);
  await p.goto(U + '/ricette/'); await p.waitForSelector('text=Biscotti al pistacchio');
  assert(true, 'backup restored');

  // 8. menu mobile
  await p.setViewportSize({ width: 390, height: 800 });
  await p.goto(U + '/'); await p.click('button[aria-label=Menu]');
  await p.click('[role=dialog] >> text=Report'); await p.waitForURL('**/report/');
  assert(true, 'mobile navigation');

  assert(errs.length === 0, 'no console errors ' + errs.join(' | '));
  await b.close();
  server.kill();
})().catch((e) => { console.error(e.message); process.exit(1); });

