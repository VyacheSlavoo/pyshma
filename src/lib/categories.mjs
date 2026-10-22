// Категории прайса. Набор страниц определяется тем, что есть в content/prices.json и content/rental.json.
// kind: concrete | pmd | mortar | rebar | rental. group: раздел меню «Продукция».

export const CATEGORY_DEFS = {
  'tovarnyy-beton': { kind: 'concrete', group: 'Бетон', menu: 'Товарный бетон', order: 1 },
  'beton-s-pmd': { kind: 'pmd', group: 'Бетон', menu: 'Бетон с ПМД', order: 2 },
  'fibrobeton': { kind: 'concrete', group: 'Бетон', menu: 'Фибробетон', order: 3 },
  'gidrotehnicheskiy-beton': { kind: 'concrete', group: 'Бетон', menu: 'Гидротехнический бетон', order: 4 },
  'beton-na-melkom-share': { kind: 'concrete', group: 'Бетон', menu: 'Бетон на мелком щебне', order: 5 },
  'beton-na-granite': { kind: 'concrete', group: 'Бетон', filler: 'granite', menu: 'Бетон на граните', order: 6 },
  'beton-na-gravii': { kind: 'concrete', group: 'Бетон', filler: 'gravel', menu: 'Бетон на гравии', order: 7 },
  'keramzitobeton': { kind: 'concrete', group: 'Бетон', menu: 'Керамзитобетон', order: 8 },
  'suhoy-beton': { kind: 'concrete', group: 'Бетон', menu: 'Сухой бетон', order: 9 },
  'rastvory': { kind: 'mortar', group: 'Растворы', menu: 'Кладочные и монтажные растворы', order: 10 },
  'tsps': { kind: 'mortar', group: 'Растворы', menu: 'ЦПС', order: 11 },
  'armatura': { kind: 'rebar', group: 'Металл и техника', menu: 'Арматура', order: 12 },
  'arenda-abn': { kind: 'rental', group: 'Металл и техника', menu: 'Аренда АБН', order: 13 }
};

export const CONCRETE_KINDS = new Set(['concrete', 'pmd']);
export const GROUP_ORDER = ['Бетон', 'Растворы', 'Металл и техника'];
