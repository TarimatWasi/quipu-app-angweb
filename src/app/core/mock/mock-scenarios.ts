/** The scenarios of the simulated BFF, with the label the panel shows. */
export const MOCK_SCENARIOS = {
  normal: 'Normal',
  empty: 'Vacío',
  'load-error': 'Error de carga',
  slow: 'Servidor lento',
  conflict: 'Conflicto 409',
} as const;

export type MockScenario = keyof typeof MOCK_SCENARIOS;

export function isMockScenario(value: string | null): value is MockScenario {
  return value !== null && Object.hasOwn(MOCK_SCENARIOS, value);
}
