/**
 * Script de prueba rápida — correr con ts-node ANTES de integrar con NestJS.
 *
 * Uso:
 *   npx ts-node apps/api/src/scraper/scrapers/test-run.ts
 *
 * Qué valida:
 *   1. Que axios puede acceder al sitio
 *   2. Que los selectores confirmados con DevTools encuentran productos
 *   3. Que el parser produce campos correctos
 *   4. Muestra los primeros 5 productos en consola con todos sus campos
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseProductName, parsePrice, extractSourceId } from './product.parser';

const TEST_URL = 'https://www.farmaciasanmartin.ar/shop/venta-libre-PC20416';
const BASE_URL  = 'https://www.farmaciasanmartin.ar';

// Selectores 100% confirmados con DevTools (innerHTML completo del card)
const SEL = {
  card:       'div.product-list-item',
  link:       'a[href*="/shop/product/"]',
  name:       'h3.kw-details-title span.child-top',
  brand:      'div.product-name',
  category:   'div.product-category',
  price:      'span.price span.amount',      // .last() = precio final
  priceNoTax: 'div.price-without-taxes',
};

async function testRun() {
  console.log('─'.repeat(60));
  console.log('TEST RUN — Farmacia San Martín');
  console.log('─'.repeat(60));

  // 1. Fetch
  console.log(`\n[1] Fetching: ${TEST_URL}`);
  const res = await axios.get<string>(TEST_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' },
    timeout: 15000,
  });
  console.log(`    Status: ${res.status} | HTML: ${res.data.length} chars`);

  // 2. Cargar en cheerio
  const $ = cheerio.load(res.data);

  // 3. Contar cards encontrados
  const cards = $(SEL.card);
  console.log(`\n[2] Cards encontrados con "div.product-list-item": ${cards.length}`);
  if (cards.length === 0) {
    console.error('    ❌ Selector no encontró productos. Revisar en DevTools.');
    return;
  }

  // 4. Extraer y mostrar primeros 5 productos
  console.log('\n[3] Primeros 5 productos:\n');
  let count = 0;

  cards.each((_, el) => {
    if (count >= 5) return false;
    const card = $(el);

    const href      = card.find(SEL.link).attr('href') ?? '';
    const fullUrl   = href.startsWith('http') ? href : `${BASE_URL}${href}`;
    const sourceId  = extractSourceId(fullUrl);
    const rawName   = card.find(SEL.name).text().trim();
    const brand     = card.find(SEL.brand).text().trim();
    const category  = card.find(SEL.category).text().trim();
    const priceText = card.find(SEL.price).last().text().trim();
    const price     = parsePrice(priceText);
    const noTaxText = card.find(SEL.priceNoTax).text();
    const noTaxVal  = noTaxText.match(/\$\s*([\d.,]+)/)?.[1];
    const priceNoTax = noTaxVal ? parsePrice(noTaxVal) : null;
    const inStock   = !card.text().includes('SIN STOCK');

    if (!rawName || !sourceId) return;

    const parsed = parseProductName(rawName);

    console.log(`  ── Producto ${++count} ──────────────────────────`);
    console.log(`  source_id:    ${sourceId}`);
    console.log(`  name:         ${rawName}`);
    console.log(`  base_name:    ${parsed.base_name}`);
    console.log(`  dose:         ${parsed.dose ?? '—'}`);
    console.log(`  quantity:     ${parsed.quantity ?? '—'}`);
    console.log(`  presentation: ${parsed.presentation ?? '—'}`);
    console.log(`  laboratory:   ${brand || '—'}`);
    console.log(`  subcategory:  ${category || '—'}`);
    console.log(`  price:        $${price}`);
    console.log(`  price_no_tax: ${priceNoTax ? '$' + priceNoTax : '—'}`);
    console.log(`  in_stock:     ${inStock}`);
    console.log(`  url:          ${fullUrl}`);
    console.log();
  });

  // 5. Verificar paginación
  console.log('[4] Verificando paginación...');
  const page2Url = `${TEST_URL}?page=2`;
  try {
    const res2 = await axios.get<string>(page2Url, {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' },
      timeout: 10000,
    });
    const $2 = cheerio.load(res2.data);
    const cards2 = $2(SEL.card).length;
    console.log(`    ?page=2 → ${cards2} productos`);
    console.log(cards2 > 0
      ? '    ✅ Paginación por ?page=N funciona — el scraper ya la maneja.'
      : '    ⚠️  Sin productos en page=2 — puede ser scroll infinito o una sola página.');
  } catch {
    console.log('    ⚠️  Error al acceder a page=2.');
  }

  console.log('\n' + '─'.repeat(60));
  console.log('Si ves 5 productos con datos correctos → listo para integrar con NestJS.');
  console.log('─'.repeat(60));
}

testRun().catch(console.error);
