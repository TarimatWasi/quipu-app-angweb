/**
 * FE-ANG-SEC-02: the `returnUrl` of the query is only followed when it is a path of this app. A
 * second slash or a backslash would let it name another host, and the root and the login lead
 * back here; anything else (including control characters) sends the person to /home.
 */
export function safeReturnUrl(value: string | null): string | null {
  if (value === null || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (char === '\\' || code < 0x20 || code === 0x7f) {
      return null;
    }
  }
  const [path = ''] = value.split(/[?#]/, 1);
  return path === '/' || path === '/login' || path.startsWith('/login/') ? null : value;
}
