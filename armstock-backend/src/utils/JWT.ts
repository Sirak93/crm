import jwt from "jsonwebtoken";
import { createHash, timingSafeEqual } from "crypto";
import { UserRole } from "armstock-shared";

export interface AuthUserJwtPayload {
    userUUID: string;
    role: UserRole;
}

export const generateToken = (payload: AuthUserJwtPayload) => {
    return jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: Number(process.env.JWT_EXPIRES_IN),
    });
};

export const verifyToken = (token: string): AuthUserJwtPayload & { iat?: number } => {
    return jwt.verify(token, process.env.JWT_SECRET!) as AuthUserJwtPayload & { iat?: number };
};

export const generateRefreshToken = (payload: AuthUserJwtPayload) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: Number(process.env.JWT_REFRESH_EXPIRES_IN),
    });
};

export const verifyRefreshToken = (token: string): AuthUserJwtPayload => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as AuthUserJwtPayload;
};

/**
 * Log details for a failed token check. Only an expired token's content can be trusted:
 * jsonwebtoken checks the signature first, so `TokenExpiredError` means the token is ours.
 */
export const tokenFailureDetails = (token: string, error: any) => {
    if (!(error instanceof jwt.TokenExpiredError)) return { reason: error.message };

    const payload = jwt.decode(token) as AuthUserJwtPayload;
    return {
        reason: error.message,
        expiredAt: error.expiredAt.toISOString(),
        userUuid: payload.userUUID,
        role: UserRole[payload.role],
    };
};

// SHA-256, not bcrypt: the token is high-entropy (nothing to brute-force), and bcrypt
// reads only the first 72 bytes - identical across one user's JWTs, so old tokens matched.
export const hashRefreshToken = (token: string): string => {
    return createHash("sha256").update(token).digest("hex");
};

export const refreshTokenMatches = (token: string, storedHash: string): boolean => {
    const provided = Buffer.from(hashRefreshToken(token));
    const stored = Buffer.from(storedHash);
    return provided.length === stored.length && timingSafeEqual(provided, stored);
};
