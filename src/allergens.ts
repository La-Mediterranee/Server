export type AllgenKeys =
	| 'A'
	| 'B'
	| 'C'
	| 'D'
	| 'E'
	| 'F'
	| 'G'
	| 'H'
	| 'L'
	| 'M'
	| 'N'
	| 'O'
	| 'P'
	| 'R';

export const allergenKeys: AllgenKeys[] = [
	'A',
	'B',
	'C',
	'D',
	'E',
	'F',
	'G',
	'H',
	'L',
	'M',
	'N',
	'O',
	'P',
	'R'
];

export const allergens = {
	en: {
		A: 'Gluten-containing grains',
		B: 'Crustaceans',
		C: 'Egg',
		D: 'Fish',
		E: 'Peanut',
		F: 'Soy',
		G: 'Milk or lactose',
		H: 'Edible nuts',
		L: 'Celery',
		M: 'Mustard',
		N: 'Sesame',
		O: 'Sulphites',
		P: 'Lupines',
		R: 'Molluscs'
	},
	de: {
		A: 'glutenhaltiges Getreide',
		B: 'Krebstiere',
		C: 'Ei',
		D: 'Fisch',
		E: 'Erdnuss',
		F: 'Soja',
		G: 'Milch or Laktose',
		H: 'Schalenfrüchte',
		L: 'Sellerie',
		M: 'Senf',
		N: 'Sesamsamen',
		O: 'Schwefeldioxid',
		P: 'Lupinen',
		R: 'Weichtiere'
	},
	ar: {
		A: 'الحبوب التي تحتوي على الغلوتين',
		B: 'القشريات',
		C: 'البيض',
		D: 'السمك',
		E: 'الفول السوداني',
		F: 'الصويا',
		G: 'الحليب أو اللاكتوز',
		H: 'المكسرات',
		L: 'كرفس',
		M: 'خردل',
		N: 'بذور السمسم',
		O: 'ثاني أكسيد الكبريت',
		P: 'الترمس',
		R: 'الرخويات'
	}
};
