/** Session for full admin UI (`/admin/*`): PIN + role written after successful `POST /api/admin/login`. */
export function hasGodAdminSession(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  const pin = sessionStorage.getItem('adminPin');
  const role = sessionStorage.getItem('adminRole');
  return Boolean(pin) && role === 'god_admin';
}
