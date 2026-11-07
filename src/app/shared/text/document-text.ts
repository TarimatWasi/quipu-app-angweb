/** The types of document of a person, as the contract has them (DocumentType). */
export type DocumentType = 'DNI' | 'CE' | 'PASSPORT';

/** As the screens write the document of a person: «DNI 70412233», «Pasaporte X123». */
export const DOCUMENT_TYPE_LABELS: Readonly<Record<DocumentType, string>> = {
  DNI: 'DNI',
  CE: 'CE',
  PASSPORT: 'Pasaporte',
};

export function documentLabel(type: DocumentType, number: string): string {
  return `${DOCUMENT_TYPE_LABELS[type]} ${number}`;
}
