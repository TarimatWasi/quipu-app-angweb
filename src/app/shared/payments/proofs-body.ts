/** Multipart parts in contract order: scalar fields, JSON proofs, then indexed files. */
export function proofsBody(
  proofs: readonly object[],
  files: readonly File[],
  fields: Readonly<Record<string, string>> = {},
): FormData {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.append(name, value);
  body.append('proofs', new Blob([JSON.stringify(proofs)], { type: 'application/json' }));
  for (const file of files) body.append('files', file, file.name);
  return body;
}
