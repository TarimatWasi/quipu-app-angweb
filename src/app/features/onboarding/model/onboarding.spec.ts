import {
  consentEnding,
  consentParagraphs,
  consentProblem,
  documentsButton,
  documentsPrompt,
  isAlreadyCompleted,
  isOutOfOrder,
  registrationSteps,
  stepCounter,
  stepProblem,
} from './onboarding';

const failure = (status: number, code: string | null = null, field: string | null = null) => ({
  status,
  code,
  field,
  body: {},
});

describe('O1 to O3 «Tu registro»', () => {
  it('counts the step out of four, the password being the first', () => {
    expect(stepCounter('PERSONAL_DATA')).toBe('Tu registro · paso 2 de 4');
    expect(stepCounter('DOCUMENTS')).toBe('Tu registro · paso 3 de 4');
    expect(stepCounter('CONSENT')).toBe('Tu registro · paso 4 de 4');
  });

  it('marks what is done, the step it is on and the documents as optional', () => {
    expect(registrationSteps('DOCUMENTS', 0).map(({ done, current }) => [done, !!current])).toEqual(
      [
        [true, false],
        [true, false],
        [false, true],
        [false, false],
      ],
    );
    const last = registrationSteps('CONSENT', 2);
    expect(last[2]).toEqual(
      expect.objectContaining({ done: true, optional: true, detail: '2 archivos' }),
    );
    expect(registrationSteps('CONSENT', 1)[2]?.detail).toBe('1 archivo');
    expect(registrationSteps('CONSENT', 0)[2]?.detail).toBeUndefined();
  });

  it('knows a registration closed in another window and a step sent out of order', () => {
    expect(isAlreadyCompleted(failure(409, 'ONBOARDING_ALREADY_COMPLETED'))).toBe(true);
    expect(isAlreadyCompleted(failure(409, 'ONBOARDING_STEP_OUT_OF_ORDER'))).toBe(false);
    expect(isOutOfOrder(failure(409, 'ONBOARDING_STEP_OUT_OF_ORDER'))).toBe(true);
    expect(isOutOfOrder(failure(500))).toBe(false);
  });

  it('words the main button of the documents by what it will do', () => {
    expect(documentsButton(0, 0, 0)).toBe('Continuar sin documentos');
    expect(documentsButton(2, 0, 0)).toBe('Continuar');
    expect(documentsButton(0, 2, 0)).toBe('Subir y continuar');
    expect(documentsButton(0, 3, 2)).toBe('Subiendo 2 de 3…');
    expect(documentsPrompt(0)).toBe('Elige fotos o PDF de tus documentos.');
    expect(documentsPrompt(2)).toBe('Puedes agregar 3 más.');
  });

  it('words a failed «Continuar» from the catalog, never from the server', () => {
    expect(stepProblem(failure(0))).toContain('No se pudo conectar');
    expect(stepProblem(failure(429))).toContain('Demasiados intentos');
    expect(stepProblem(failure(500))).toBe('No se pudo continuar. Inténtalo de nuevo.');
  });

  it('splits the consent text into its paragraphs', () => {
    expect(consentParagraphs('Uno.\n\n\nDos.\n\n  \n\nTres.')).toEqual(['Uno.', 'Dos.', 'Tres.']);
    expect(consentParagraphs('')).toEqual([]);
  });

  it('says what each failure of the consent means', () => {
    expect(consentProblem(failure(400, 'CONSENT_NOT_ACCEPTED'))).toEqual({
      place: 'check',
      message: 'Debes marcar el consentimiento de datos personales',
    });
    expect(consentProblem(failure(400, 'VALIDATION_ERROR', 'consentVersion'))).toEqual({
      place: 'changed',
    });
    expect(consentProblem(failure(400, 'VALIDATION_ERROR', 'otro')).place).toBe('general');
    expect(JSON.stringify(consentProblem(failure(0)))).toContain('No se pudo conectar');
    expect(consentProblem(failure(500))).toEqual({
      place: 'general',
      message: 'No se pudo terminar tu registro. Inténtalo de nuevo.',
    });
  });

  it('says where the guest goes at the end by its kind', () => {
    expect(consentEnding(false).after).toBe('Después: tu cuenta en Quipu.');
    expect(consentEnding(true).after).toBe('Después: tu estado de pago.');
  });
});
