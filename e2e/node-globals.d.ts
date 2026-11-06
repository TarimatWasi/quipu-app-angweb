// The only Node global the captures use (playwright.config.ts reads CI), without adding @types/node.
declare const process: { readonly env: Readonly<Record<string, string | undefined>> };
