// Категории прайса. Набор страниц определяется тем, что есть в content/prices.json и content/rental.json.

export const CATEGORY_DEFS = {
  'tovarnyy-beton': { kind: 'concrete', menu: 'Товарный бетон', order: 1 },
  'beton-s-pmd': { kind: 'pmd', menu: 'Бетон с ПМД', order: 2 },
  'beton-na-granite': { kind: 'concrete', filler: 'granite', menu: 'Бетон на граните', order: 3 },
  'beton-na-gravii': { kind: 'concrete', filler: 'gravel', menu: 'Бетон на гравии', order: 4 },
  'rastvory': { kind: 'mortar', menu: 'Растворы', order: 5 },
  'arenda-abn': { kind: 'rental', menu: 'Аренда АБН', order: 6 }
};

export const CONCRETE_KINDS = new Set(['concrete', 'pmd']);
