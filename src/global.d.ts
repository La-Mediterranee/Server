type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };

declare const fetch: typeof import('node-fetch').default;
