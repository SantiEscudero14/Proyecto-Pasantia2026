import { parseProductName, parsePrice, extractSourceId } from './product.parser';

// ─── parseProductName ────────────────────────────────────────────────────────

describe('parseProductName — casos reales del sitio', () => {

  test('crema con cantidad en gramos', () => {
    expect(parseProductName('Prurisedan Crema X 30 Gramos')).toEqual({
      base_name: 'Prurisedan',
      dose: null,
      quantity: 30,
      presentation: 'crema',
    });
  });

  test('loción con cantidad en ml sin X', () => {
    // "60 Ml" sin marcador X → QUANTITY_BARE_REGEX
    // "Loción" no está en PRESENTATION_MAP → presentation queda "ml"
    expect(parseProductName('Prurisedan Loción Incolora 60 Ml')).toEqual({
      base_name: 'Prurisedan Loción Incolora',
      dose: null,
      quantity: 60,
      presentation: 'ml',
    });
  });

  test('hisopos con cantidad entre paréntesis — 150', () => {
    expect(parseProductName('Algabo Hisopos (150 Unidades)')).toEqual({
      base_name: 'Algabo Hisopos',
      dose: null,
      quantity: 150,
      presentation: 'unidades',
    });
  });

  test('hisopos con cantidad entre paréntesis — 100', () => {
    expect(parseProductName('Algabo Hisopos (100 Unidades)')).toEqual({
      base_name: 'Algabo Hisopos',
      dose: null,
      quantity: 100,
      presentation: 'unidades',
    });
  });

  test('apósitos X 20 Un', () => {
    expect(parseProductName('Apósito Curitas Manía Unicornio X 20 Un')).toEqual({
      base_name: 'Apósito Curitas Manía Unicornio',
      dose: null,
      quantity: 20,
      presentation: 'unidades',
    });
  });

  test('cápsulas con cantidad pegada X10', () => {
    expect(parseProductName('Bayer Actron Mujer Rápida Acción Forte Capsulas X10')).toEqual({
      base_name: 'Bayer Actron Mujer Rápida Acción Forte',
      dose: null,
      quantity: 10,
      presentation: 'cápsulas',
    });
  });

  test('gel con cantidad en gramos', () => {
    expect(parseProductName('Ultra Bengue Desinflamante Gel X 35 Gramos')).toEqual({
      base_name: 'Ultra Bengue Desinflamante',
      dose: null,
      quantity: 35,
      presentation: 'gel',
    });
  });

  test('solución con ml — presentación sobreescribe ml', () => {
    // "X 125ml" → quantity:125, presentation tentativa:"ml"
    // Después "Solución" en el nombre sobreescribe → "solución"
    expect(parseProductName('Espadol Dettol Antiséptico Solución X 125ml')).toEqual({
      base_name: 'Espadol Dettol Antiséptico',
      dose: null,
      quantity: 125,
      presentation: 'solución',
    });
  });

  test('saquitos con abreviatura saq', () => {
    expect(parseProductName('Saint Gottard Bienestar Diuretico X 20saq')).toEqual({
      base_name: 'Saint Gottard Bienestar Diuretico',
      dose: null,
      quantity: 20,
      presentation: 'saquitos',
    });
  });

  test('pomada con cantidad en gramos — Cicatrizante queda en base_name', () => {
    // "X 30g" → quantity:30, unit peso → presentation null
    // "Pomada" detectado como palabra → presentation: "pomada", removido del nombre
    // "Cicatrizante" no es presentación → queda en base_name
    expect(parseProductName('Hipoglós Vl Pomada Cicatrizante X 30g')).toEqual({
      base_name: 'Hipoglós Vl Cicatrizante',
      dose: null,
      quantity: 30,
      presentation: 'pomada',
    });
  });

  test('con dosis mg y comprimidos', () => {
    expect(parseProductName('Ibuprofeno 400 mg x 20 Comprimidos')).toEqual({
      base_name: 'Ibuprofeno',
      dose: '400 mg',
      quantity: 20,
      presentation: 'comprimidos',
    });
  });

  test('con dosis mg sin cantidad', () => {
    expect(parseProductName('Atenolol 50 mg Comprimidos')).toEqual({
      base_name: 'Atenolol',
      dose: '50 mg',
      quantity: null,
      presentation: 'comprimidos',
    });
  });

  test('sin ningún campo parseable', () => {
    const result = parseProductName('Silfab Andador De Aluminio Plegable');
    expect(result.base_name).toBe('Silfab Andador De Aluminio Plegable');
    expect(result.dose).toBeNull();
    expect(result.quantity).toBeNull();
    expect(result.presentation).toBeNull();
  });
});

// ─── parsePrice ──────────────────────────────────────────────────────────────

describe('parsePrice — formatos reales del sitio', () => {

  test('precio sin centavos', () => {
    expect(parsePrice('$8.603')).toBe(8603);
  });

  test('precio con centavos', () => {
    expect(parsePrice('$ 7.109,92')).toBeCloseTo(7109.92);
  });

  test('precio chico', () => {
    expect(parsePrice('$2.440')).toBe(2440);
  });

  test('precio grande', () => {
    expect(parsePrice('$132.260')).toBe(132260);
  });

  test('precio sin símbolo (como viene en span.amount)', () => {
    expect(parsePrice('27.320')).toBe(27320);
  });
});

// ─── extractSourceId ─────────────────────────────────────────────────────────

describe('extractSourceId — URLs reales del sitio', () => {

  test('URL completa', () => {
    expect(extractSourceId(
      'https://www.farmaciasanmartin.ar/shop/product/hipoglos-vl-pomada-x-30g-WS1853068'
    )).toBe('WS1853068');
  });

  test('URL relativa', () => {
    expect(extractSourceId(
      '/shop/product/algabo-hisopos-100-unidades-WS1116005'
    )).toBe('WS1116005');
  });

  test('sin WS ID retorna null', () => {
    expect(extractSourceId('https://www.farmaciasanmartin.ar/shop')).toBeNull();
  });
});