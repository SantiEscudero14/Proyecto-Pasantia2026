// ─── Tipos ───────────────────────────────────────────────────────────────────
 
export interface ParsedName {
  base_name: string;
  dose: string | null;
  quantity: number | null;
  presentation: string | null;
}
 
// ─── Mapas de normalización ───────────────────────────────────────────────────
 
const PRESENTATION_MAP: Record<string, string> = {
  comprimidos:  'comprimidos',
  comprimido:   'comprimidos',
  comp:         'comprimidos',
  capsulas:     'cápsulas',
  capsula:      'cápsulas',
  caps:         'cápsulas',
  grageas:      'grageas',
  tabletas:     'tabletas',
  tableta:      'tabletas',
  crema:        'crema',
  gel:          'gel',
  pomada:       'pomada',
  solucion:     'solución',
  solución:     'solución',
  jarabe:       'jarabe',
  suspension:   'suspensión',
  suspensión:   'suspensión',
  gotas:        'gotas',
  spray:        'spray',
  aerosol:      'aerosol',
  polvo:        'polvo',
  parche:       'parche',
  supositorio:  'supositorio',
  ovulo:        'óvulo',
  ungüento:     'ungüento',
  // Nota: "loción" NO está aquí — es parte del nombre base en este sitio,
  // no un campo de presentación separado (ej: "Prurisedan Loción Incolora").
};
 
const UNIT_TO_PRESENTATION: Record<string, string | null> = {
  unidades:    'unidades',
  unidad:      'unidades',
  un:          'unidades',
  uds:         'unidades',
  saquitos:    'saquitos',
  saq:         'saquitos',
  comprimidos: 'comprimidos',
  capsulas:    'cápsulas',
  caps:        'cápsulas',
  ml:          'ml',   // fallback — se sobreescribe si hay palabra en el nombre
  l:           'l',
  gramos:      null,   // peso puro → presentación viene del nombre (crema, gel...)
  grs:         null,
  gs:          null,
  gr:          null,
  g:           null,
};
 
// ─── Regex ────────────────────────────────────────────────────────────────────
 
/** Dosis: solo mg/mcg/ug — unidades farmacológicas */
const DOSE_REGEX = /(\d+(?:[.,]\d+)?)\s*(mg|mcg|ug)\b/i;
 
/**
 * Cantidad con X o () + unidad.
 * ⚠️ Alternativas de MÁS LARGA a MÁS CORTA — evita que "gr" matchee antes que "gramos"
 */
const QUANTITY_MARKED_REGEX =
  /(?:[Xx]\s*|\()(\d+)\s*(gramos|grs|unidades|unidad|saquitos|capsulas|comprimidos|uds|ml|gs|gr|caps|saq|un|g|l)(?:\)|\b)/i;
 
/** Cantidad sin X: "60 Ml", "150 gr" al final del nombre */
const QUANTITY_BARE_REGEX =
  /\b(\d+)\s*(gramos|grs|unidades|unidad|saquitos|uds|ml|gs|gr|un|g|l)\b/i;
 
/** X + número sin unidad: "Capsulas X10", "X 20" */
const QUANTITY_X_ONLY_REGEX = /[Xx]\s*(\d+)(?!\s*(?:mg|mcg|ug|g|ml))\b/i;
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
 
function unitToPresentation(unit: string): string | null {
  return UNIT_TO_PRESENTATION[unit.toLowerCase().trim()] ?? null;
}
 
function detectPresentation(text: string): { normalized: string; keyword: string } | null {
  for (const [keyword, normalized] of Object.entries(PRESENTATION_MAP)) {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(text)) {
      return { normalized, keyword };
    }
  }
  return null;
}
 
// ─── Parser principal ─────────────────────────────────────────────────────────
 
/**
 * Parsea el nombre completo de un producto farmacéutico.
 *
 * Orden:
 *  1. QUANTITY_MARKED  — "X 30 Gramos", "(150 Unidades)", "X 125ml"
 *  2. QUANTITY_BARE    — "60 Ml" sin marcador
 *  3. QUANTITY_X_ONLY  — "Capsulas X10" (X sin unidad)
 *  4. DOSE             — "400 mg" sobre lo que quedó
 *  5. PRESENTATION     — palabra en el nombre, sobreescribe la de la unidad
 *  6. Limpiar base_name
 */
export function parseProductName(rawName: string): ParsedName {
  let working = rawName.trim();
  let dose: string | null = null;
  let quantity: number | null = null;
  let presentation: string | null = null;
 
  // 1. Cantidad marcada (X o paréntesis) con unidad
  const m1 = working.match(QUANTITY_MARKED_REGEX);
  if (m1) {
    quantity = parseInt(m1[1], 10);
    presentation = unitToPresentation(m1[2]);
    working = working.replace(m1[0], '').trim();
  }
 
  // 2. Cantidad sin marcador: número + unidad
  if (quantity === null) {
    const m2 = working.match(QUANTITY_BARE_REGEX);
    if (m2) {
      quantity = parseInt(m2[1], 10);
      presentation = unitToPresentation(m2[2]);
      working = working.replace(m2[0], '').trim();
    }
  }
 
  // 3. X + número sin unidad
  if (quantity === null) {
    const m3 = working.match(QUANTITY_X_ONLY_REGEX);
    if (m3) {
      quantity = parseInt(m3[1], 10);
      working = working.replace(m3[0], '').trim();
    }
  }
 
  // 4. Dosis (mg/mcg/ug)
  const m4 = working.match(DOSE_REGEX);
  if (m4) {
    dose = `${m4[1]} ${m4[2].toLowerCase()}`;
    working = working.replace(m4[0], '').trim();
  }
 
  // 5. Presentación como palabra — sobreescribe la tentativa del step 1/2
  const presWord = detectPresentation(working);
  if (presWord) {
    presentation = presWord.normalized;
    working = working
      .replace(new RegExp(`\\b${presWord.keyword}\\b`, 'i'), '')
      .trim();
  }
 
  // 6. Limpiar base_name
  const base_name = working
    .replace(/\s{2,}/g, ' ')
    .replace(/^[-\sXx]+|[-\s]+$/g, '')
    .trim();
 
  return { base_name, dose, quantity, presentation };
}
 
// ─── Utilidades ───────────────────────────────────────────────────────────────
 
export function parsePrice(raw: string): number {
  const cleaned = raw
    .replace(/\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
}
 
export function extractSourceId(url: string): string | null {
  const match = url.match(/(WS\d+)(?:[^/]*)?$/);
  return match ? match[1] : null;
}