# Droguería Scraper — Guía de arranque

## Estructura generada

```
drogueria-scraper/
├── packages/types/src/index.ts              ← interfaces compartidas
└── apps/api/src/scraper/
    ├── parser/
    │   └── product.parser.ts                ← lógica de parseo (pura, testeable)
    ├── scrapers/
    │   ├── farmacia-san-martin.scraper.ts   ← scraper con selectores confirmados
    │   └── test-run.ts                      ← script de prueba manual
    └── test/
        └── product.parser.test.ts           ← tests Jest con casos reales
```

## Paso 1 — Instalar dependencias

```bash
cd apps/api
npm install axios cheerio
npm install -D @types/cheerio ts-node typescript jest @types/jest ts-jest
```

## Paso 2 — Correr los tests del parser

```bash
npx jest product.parser
```

Todos los tests deben pasar **antes** de tocar el scraper.
Si alguno falla, corregir `product.parser.ts`.

## Paso 3 — Verificar que el sitio es accesible y los selectores funcionan

```bash
npx ts-node apps/api/src/scraper/scrapers/test-run.ts
```

Este script:
- Hace un GET real a la página de "Venta Libre"
- Prueba múltiples selectores CSS e informa cuáles encuentran productos
- Muestra los primeros 5 productos parseados en consola

**Si los selectores devuelven 0 elementos:**
→ Abrir la URL en Chrome → F12 → Elements → buscar el elemento que contiene
  los productos → click derecho → "Copy selector" → actualizar `SELECTORS`
  en `farmacia-san-martin.scraper.ts`

## Paso 4 — Verificar paginación

Abrir en el navegador:
```
https://www.farmaciasanmartin.ar/shop/venta-libre-PC20416?page=2
```

- Si carga más productos → la paginación por `?page=N` funciona ✅ (el scraper ya la maneja)
- Si no carga nada → puede ser scroll infinito o botón "Ver más" → ajustar `scrapeCategory()`

## Paso 5 — Integrar con NestJS

Una vez que `test-run.ts` muestra datos correctos, crear el módulo NestJS:

```typescript
// apps/api/src/scraper/scraper.service.ts
@Injectable()
export class ScraperService {
  async runFarmaciaSanMartin(): Promise<Product[]> {
    const scraper = new FarmaciaSanMartinScraper();
    return scraper.scrapeAll();
  }
}
```

## Selectores confirmados (DevTools)

| Campo   | Selector CSS confirmado              | Dónde aparece |
|---------|--------------------------------------|---------------|
| Nombre  | `h1.product_title.entry-title`       | Página detalle |
| Marca   | `a.page-subtitle.brand`              | Página detalle |
| Contenedor | `div.summary.entry-summary.brand-logo` | Página detalle |

Los selectores del listado (cards) se auto-detectan en `test-run.ts`.
