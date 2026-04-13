// ─── Entidad principal ────────────────────────────────────────────────────────

export interface Product {
  /** ID único del producto en la fuente, ej: "WS1853068" */
  source_id: string;

  /** Nombre completo tal como aparece en el sitio */
  name: string;

  /** Nombre base sin cantidad ni presentación, ej: "Prurisedan Crema" */
  base_name: string;

  /** Dosis si aplica, ej: "400 mg", "500 mg" — null si no se detecta */
  dose: string | null;

  /** Número de unidades, ej: 30, 150, 20 — null si no se detecta */
  quantity: number | null;

  /** Tipo de presentación normalizado, ej: "gramos", "ml", "unidades" */
  presentation: string | null;

  /** Precio final (con impuestos), en pesos argentinos */
  price: number;

  /** Precio sin impuestos nacionales — disponible en este sitio */
  price_without_taxes: number | null;

  /** Marca / laboratorio — viene separado del nombre en este sitio */
  laboratory: string | null;

  /** Subcategoría en el sitio, ej: "Venta Libre", "Apósitos" */
  subcategory: string | null;

  /** URL canónica del producto */
  url: string;

  /** Nombre de la farmacia fuente */
  source: 'farmacia-san-martin' | 'farmacia-sabin' | 'farmacia-cuyo';

  /** Timestamp de extracción */
  extracted_at: string;

  /** Si el producto está disponible en stock */
  in_stock: boolean;
}

// ─── Resultado del parser ─────────────────────────────────────────────────────

export interface ParsedName {
  base_name: string;
  dose: string | null;
  quantity: number | null;
  presentation: string | null;
}

// ─── Log de ejecución ─────────────────────────────────────────────────────────

export interface ExecutionLog {
  id?: string;
  source: Product['source'];
  status: 'success' | 'partial' | 'failed';
  products_count: number;
  errors: string[];
  executed_at: string;
}

// ─── Farmacias registradas ────────────────────────────────────────────────────

export interface Pharma {
  id?: string;
  name: string;
  slug: Product['source'];
  base_url: string;
  /** URLs de categorías a scrapear */
  category_urls: string[];
}
