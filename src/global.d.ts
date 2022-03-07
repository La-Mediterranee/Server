/// <reference types="fastify" />
/// <reference types="fastify-auth" />
/// <reference types="fastify-passport" />

type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };

//@ts-ignore
declare const fetch: typeof import('node-fetch').default;
