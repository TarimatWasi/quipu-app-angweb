import { RedirectCommand, Router, RouterStateSnapshot } from '@angular/router';

/** The internal path of «Sin acceso» (A0.7); the address bar never shows it. */
export const NO_ACCESS_PATH = 'no-access';

/**
 * A0.7 «Sin acceso»: a session that a role guard turns away sees that page under the address it
 * asked for (`browserUrl`), not a redirect to its home, and the page names nothing of the other
 * account (SEG-07). A reload of that address asks the guard again and lands on the same page.
 */
export function noAccess(router: Router, state: RouterStateSnapshot): RedirectCommand {
  return new RedirectCommand(router.parseUrl(`/${NO_ACCESS_PATH}`), {
    browserUrl: state.url,
  });
}
