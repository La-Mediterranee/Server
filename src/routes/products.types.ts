import type { AllgenKeys } from '../allergens';

type SKU = string;
type ID = string;

export type Variations = DeepReadonly<{
	toppings?: Topping[];
}>;

export interface ToppingOption {
	readonly ID: ID;
	readonly name: string;
	readonly desc: string;
	readonly price: number;
}

export interface Topping {
	readonly ID: ID;
	readonly name: string;
	readonly options: ToppingOption[];
	readonly qtyMin: number;
	readonly qtyMax: number;
}

export interface Image {
	readonly src: string;
	readonly alt?: string;
}

export interface Product {
	readonly ID: ID;
	readonly sku?: SKU;
	readonly name: string;
	readonly desc: string;
	readonly price: number;
	readonly image: Image;
	readonly categories: readonly string[];
	readonly variations?: Variations;
	readonly toppings: readonly Topping[];
	readonly allergens: readonly AllgenKeys[];
	readonly rating?: {
		readonly value: number;
		readonly count: number;
	};
}

export interface CartItem extends Product {
	quantity: number;
}
