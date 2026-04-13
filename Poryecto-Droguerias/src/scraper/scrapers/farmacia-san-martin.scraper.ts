import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  parseProductName,
  parsePrice,
  extractSourceId,
} from './product.parser'; // ✅ mismo directorio

// ─── Tipo Product inline (sin @drogueria/types) ───────────────────────────────

export interface Product {
  source_id: string;
  name: string;
  base_name: string;
  dose: string | null;
  quantity: number | null;
  presentation: string | null;
  price: number;
  price_without_taxes: number | null;
  laboratory: string | null;
  subcategory: string | null;
  url: string;
  source: 'farmacia-san-martin';
  extracted_at: string;
  in_stock: boolean;
}

// ─── Configuración ────────────────────────────────────────────────────────────

const SOURCE = 'farmacia-san-martin' as const;
const BASE_URL = 'https://www.farmaciasanmartin.ar';

const CATEGORY_URLS: string[] = [
  '/shop/venta-libre-PC20416',               // 53 productos
  '/shop/complementos-de-farmacia-PC20391',  // 24 productos
  '/shop/primeros-auxilios-PC20414',         // 20 productos
  '/shop/diabeticos-PC22483',                // 7 productos
  '/shop/diagnostico-medicion-PC20443',      // 7 productos
];

// ─── Selectores CSS — 100% confirmados con DevTools ──────────────────────────
/**
 * Estructura del card en el listado (confirmada del innerHTML completo):
 *
 *  li.product
 *    div.product-list-item              ← card (data-product="ID")
 *      div.promotion_container          ← "50% OFF" (opcional)
 *      a[href="/shop/product/...-WS"]   ← link
 *        div.product-name               ← "Cetaphil"      MARCA
 *        div.product-category           ← "Solares"       SUBCATEGORÍA
 *        div.details.kw-details
 *          span.price
 *            del > span.amount          ← precio tachado (opcional)
 *            span.amount                ← precio final    PRECIO
 *          h3.kw-details-title
 *            span.child-top             ← nombre completo NOMBRE
 *          div.price-without-taxes      ← sin impuestos   PRECIO SIN IMP
 *
 * Detalle de producto (confirmado con DevTools):
 *   h1.product_title.entry-title        ← nombre
 *   a.page-subtitle.brand               ← marca
 *   span.price-tag-fraction             ← precio
 */
const SELECTORS = {
  productCard:    'div.product-list-item',
  cardLink:       'a[href*="/shop/product/"]',
  cardName:       'h3.kw-details-title span.child-top',
  cardBrand:      'div.product-name',
  cardCategory:   'div.product-category',
  cardPrice:      'span.price span.amount',   // .last() = precio final
  cardPriceNoTax: 'div.price-without-taxes',
} as const;

// ─── Cliente HTTP ─────────────────────────────────────────────────────────────

const httpClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'es-AR,es;q=0.9',
  },
});

// ─── Scraper ──────────────────────────────────────────────────────────────────

export class FarmaciaSanMartinScraper {
  private errors: string[] = [];

  async scrapeAll(): Promise<Product[]> {
    console.log(`[${SOURCE}] Iniciando scraping de ${CATEGORY_URLS.length} categorías...`);
    this.errors = [];
    const allProducts: Product[] = [];
    const seenIds = new Set<string>();

    for (const categoryPath of CATEGORY_URLS) {
      try {
        const products = await this.scrapeCategory(categoryPath);
        for (const product of products) {
          if (!seenIds.has(product.source_id)) {
            seenIds.add(product.source_id);
            allProducts.push(product);
          }
        }
        await this.sleep(1500);
      } catch (err) {
        const msg = `Error en categoría ${categoryPath}: ${(err as Error).message}`;
        console.error(`[${SOURCE}] ${msg}`);
        this.errors.push(msg);
      }
    }

    console.log(
      `[${SOURCE}] Completado. Productos: ${allProducts.length}, Errores: ${this.errors.length}`
    );
    return allProducts;
  }

  private async scrapeCategory(categoryPath: string): Promise<Product[]> {
    const products: Product[] = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const url = page === 1 ? categoryPath : `${categoryPath}?page=${page}`;
      console.log(`[${SOURCE}] Scrapeando: ${url}`);

      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);
      const pageProducts = this.extractProducts($);

      if (pageProducts.length === 0) {
        hasMorePages = false;
      } else {
        products.push(...pageProducts);
        page++;
        await this.sleep(1000);
      }
    }

    return products;
  }

  private extractProducts($: cheerio.CheerioAPI): Product[] {
    const products: Product[] = [];
    const extractedAt = new Date().toISOString();

    $(SELECTORS.productCard).each((_, el) => {
      try {
        const card = $(el);

        // URL y source_id
        const href = card.find(SELECTORS.cardLink).attr('href') ?? '';
        if (!href) return;
        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        const sourceId = extractSourceId(fullUrl);
        if (!sourceId) return;

        // Nombre
        const rawName = card.find(SELECTORS.cardName).text().trim();
        if (!rawName) return;

        // Marca (div.product-name)
        const laboratory = card.find(SELECTORS.cardBrand).text().trim() || null;

        // Subcategoría (div.product-category)
        const subcategory = card.find(SELECTORS.cardCategory).text().trim() || null;

        // Precio — .last() da el precio final (con descuento si lo hay)
        const priceText = card.find(SELECTORS.cardPrice).last().text().trim();
        const price = parsePrice(priceText);
        if (!price) return;

        // Precio sin impuestos
        const noTaxText = card.find(SELECTORS.cardPriceNoTax).text();
        const noTaxMatch = noTaxText.match(/\$\s*([\d.,]+)/);
        const price_without_taxes = noTaxMatch ? parsePrice(noTaxMatch[1]) : null;

        // Stock
        const in_stock = !card.text().includes('SIN STOCK');

        // Parsear nombre
        const parsed = parseProductName(rawName);

        products.push({
          source_id:          sourceId,
          name:               rawName,
          base_name:          parsed.base_name,
          dose:               parsed.dose,
          quantity:           parsed.quantity,
          presentation:       parsed.presentation,
          price,
          price_without_taxes,
          laboratory,
          subcategory,
          url:                fullUrl,
          source:             SOURCE,
          extracted_at:       extractedAt,
          in_stock,
        });
      } catch (err) {
        const msg = `Error parseando card: ${(err as Error).message}`;
        console.warn(`[${SOURCE}] ${msg}`);
        this.errors.push(msg);
      }
    });

    return products;
  }

  private async fetchPage(path: string): Promise<string> {
    const response = await httpClient.get<string>(path);
    return response.data;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getErrors(): string[] {
    return [...this.errors];
  }
}