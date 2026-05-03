import jwt, { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

export interface TokenResult {
  token: string;
  expiresIn: string | number;
}

function generateToken<T extends JwtPayload>(payload: T, expiresIn: jwt.SignOptions['expiresIn'] = '24h'): TokenResult {
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn,
  });

  return {
    token,
    expiresIn,
  };
}


function verifyToken<T>(token: string): T {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return decoded as T;
  } catch (error) {
    throw new Error(`Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default {
    generateToken,
    verifyToken,
    decodeToken: jwt.decode,
}
