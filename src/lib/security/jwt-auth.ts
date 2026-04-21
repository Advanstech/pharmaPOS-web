import { jwtVerify, type JWTPayload } from 'jose';

export interface AuthResult {
  ok: boolean;
  status: number;
  error?: string;
  payload?: JWTPayload;
}

export type JwtRole =
  | 'owner'
  | 'se_admin'
  | 'manager'
  | 'head_pharmacist'
  | 'pharmacist'
  | 'technician'
  | 'cashier'
  | 'chemical_cashier';

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim() || null;
}

export async function verifyBearerJwt(request: Request): Promise<AuthResult> {
  const token = extractBearerToken(request);
  if (!token) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return { ok: false, status: 500, error: 'Server auth misconfigured' };
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret), {
      algorithms: ['HS256'],
    });
    if (!payload.sub) {
      return { ok: false, status: 401, error: 'Invalid token subject' };
    }
    return { ok: true, status: 200, payload };
  } catch {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
}

export function hasRequiredRole(
  payload: JWTPayload | undefined,
  allowedRoles: readonly JwtRole[],
): boolean {
  const role = typeof payload?.role === 'string' ? payload.role : '';
  return allowedRoles.includes(role as JwtRole);
}
