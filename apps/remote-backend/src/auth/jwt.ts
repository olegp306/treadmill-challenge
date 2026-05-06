import jwt from 'jsonwebtoken';

export type RemoteAdminTokenPayload = {
  sub: 'remote_admin';
  iat?: number;
};

function jwtSecret(): string {
  const raw = process.env.REMOTE_JWT_SECRET?.trim();
  if (raw) return raw;
  // Dev default: avoid breaking standalone `npm run dev:remote-backend` without env.
  if (process.env.NODE_ENV !== 'production') return 'remote-dev-secret';
  return '';
}

export function signRemoteAdminJwt(): string {
  const secret = jwtSecret();
  if (!secret) throw new Error('REMOTE_JWT_SECRET is not configured');
  return jwt.sign({ sub: 'remote_admin' satisfies RemoteAdminTokenPayload['sub'] }, secret, {
    expiresIn: '12h',
  });
}

export function verifyRemoteAdminJwt(token: string): RemoteAdminTokenPayload {
  const secret = jwtSecret();
  if (!secret) throw new Error('REMOTE_JWT_SECRET is not configured');
  return jwt.verify(token, secret) as RemoteAdminTokenPayload;
}

