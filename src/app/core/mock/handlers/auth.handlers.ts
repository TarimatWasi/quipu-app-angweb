import type { components } from '@core/api/bff.generated';
import { DEMO_CLAVE, findDemoUser } from '../data/demo-users';
import { failure, invalid, noContent, ok, raise } from '../mock-reply';
import type { MockContext, MockRoute } from '../mock-types';

type SessionInfo = components['schemas']['SessionInfo'];

const MIN_PASSWORD_LENGTH = 8;

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

/** Sign-in with the demo accounts (any other document or password is rejected), /me, logout. */
export const AUTH_ROUTES: readonly MockRoute[] = [
  {
    key: 'POST /bff/auth/login',
    handler: (req, ctx) => {
      const fields = fieldsOf(req.body);
      const user = findDemoUser(
        text(fields, 'documentType'),
        text(fields, 'documentNumber'),
        text(fields, 'password'),
      );
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
    // The code «vencido» stands for an expired or used link; any other code is accepted.
    key: 'POST /bff/auth/reset-password',
    handler: (req) => {
      const fields = fieldsOf(req.body);
      const code = text(fields, 'code');
      checkNewPassword(text(fields, 'newPassword'));
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
