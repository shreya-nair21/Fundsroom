import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fundsroom_erp_secret_jwt_key_123';

export interface TokenPayload {
  id: number;
  email: string;
  role: string;
  name: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
