import type { components } from '@core/api/bff.generated';
import {
  DEMO_CLAVE,
  DEMO_EXPIRED_CLAVE,
  DEMO_USERS,
  findDemoUser,
  findDemoUserByDocument,
} from '../data/demo-users';
import { failure, invalid, noContent, ok, raise } from '../mock-reply';
import type { MockContext, MockRoute } from '../mock-types';

type SessionInfo = components['schemas']['SessionInfo'];

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 100;

function fieldsOf(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
}

function text(fields: Record<string, unknown>, name: string): string {
  const value = fields[name];
  return typeof value === 'string' && value.trim() !== '' ? value : invalid(name);
}

/** The session of the demo account, with the password change already done when it was. */
function sessionOf(ctx: MockContext): SessionInfo | null {
  const user = ctx.user();
  if (user === null) {
    return null;
  }
  return ctx.passwordChanged() ? { ...user.session, mustChangePassword: false } : user.session;
}

function checkNewPassword(newPassword: string): void {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    raise(400, 'AUTH_WEAK_PASSWORD', 'Mínimo 8 caracteres', 'newPassword');
  }
}

/** The name an administrator writes when activating the account (A0.5), checked like the BFF does. */
function checkAdminName(name: unknown): void {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (trimmed === '' || trimmed.length > MAX_NAME_LENGTH) {
    raise(400, 'VALIDATION_ERROR', 'Escribe tu nombre completo', 'name');
  }
}

/** Sign-in with the demo accounts (any other document or password is rejected), /me, logout. */
export const AUTH_ROUTES: readonly MockRoute[] = [
  {
    key: 'POST /bff/auth/login',
    handler: (req, ctx) => {
      const fields = fieldsOf(req.body);
      const documentType = text(fields, 'documentType');
      const documentNumber = text(fields, 'documentNumber');
      const password = text(fields, 'password');
      if (
        password === DEMO_EXPIRED_CLAVE &&
        findDemoUserByDocument(documentType, documentNumber)?.key === 'temporary-password'
      ) {
        return failure(
          401,
          'AUTH_TEMPORARY_PASSWORD_EXPIRED',
          'La clave temporal venció, pide una nueva al administrador',
        );
      }
      const user = findDemoUser(documentType, documentNumber, password);
      if (user === undefined) {
        return failure(401, 'AUTH_INVALID_CREDENTIALS', 'Documento o contraseña incorrectos');
      }
      ctx.signIn(user);
      return ok(sessionOf(ctx));
    },
  },
  {
    key: 'GET /bff/auth/me',
    handler: (_req, ctx) => {
      const session = sessionOf(ctx);
      return session === null
        ? failure(401, 'AUTH_NO_SESSION', 'No hay una sesión activa.')
        : ok(session);
    },
  },
  {
    key: 'POST /bff/auth/logout',
    handler: (_req, ctx) => {
      if (ctx.user() === null) {
        return failure(401, 'AUTH_NO_SESSION', 'No hay una sesión activa.');
      }
      ctx.signOut();
      return noContent();
    },
  },
  {
    key: 'POST /bff/auth/change-password',
    handler: (req, ctx) => {
      if (ctx.user() === null) {
        return failure(401, 'AUTH_NO_SESSION', 'No hay una sesión activa.');
      }
      const newPassword = text(fieldsOf(req.body), 'newPassword');
      checkNewPassword(newPassword);
      if (newPassword === DEMO_CLAVE) {
        return failure(
          400,
          'AUTH_PASSWORD_UNCHANGED',
          'Elige una contraseña distinta de la temporal',
          'newPassword',
        );
      }
      ctx.markPasswordChanged();
      return noContent();
    },
  },
  {
    key: 'POST /bff/auth/forgot-password',
    handler: (req) => {
      const email = text(fieldsOf(req.body), 'email');
      return email.includes('@') ? noContent(202) : invalid('email');
    },
  },
  {
    // A0.4. The token «vencido» stands for an expired or used link; any other token activates the
    // guest with a contract, whose session starts right away like after a login.
    key: 'POST /bff/auth/activate',
    handler: (req, ctx) => {
      const fields = fieldsOf(req.body);
      const token = text(fields, 'token');
      checkNewPassword(text(fields, 'newPassword'));
      if (token === 'vencido') {
        return failure(
          400,
          'AUTH_INVALID_OR_EXPIRED_CODE',
          'Enlace inválido o expirado, solicita uno nuevo',
        );
      }
      ctx.signIn(DEMO_USERS['contract-guest']);
      return ok(sessionOf(ctx));
    },
  },
  {
    // The code «vencido» stands for an expired or used link; any other code is accepted. A code
    // that starts with «admin» is the link of an administrator without a name (A0.5): it needs one.
    key: 'POST /bff/auth/reset-password',
    handler: (req) => {
      const fields = fieldsOf(req.body);
      const code = text(fields, 'code');
      checkNewPassword(text(fields, 'newPassword'));
      if (code.startsWith('admin')) {
        checkAdminName(fields['name']);
      }
      return code === 'vencido'
        ? failure(
            400,
            'AUTH_INVALID_OR_EXPIRED_CODE',
            'Enlace inválido o expirado, solicita uno nuevo',
          )
        : noContent();
    },
  },
];
