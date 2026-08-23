import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { ConflictError, UnauthorizedError, ValidationError } from '../../common/errors';
import { authRepository, AuthRepository } from './auth.repository';
import { RegisterInput, LoginInput, RefreshInput, LogoutInput } from './auth.schema';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  constructor(private readonly repo: AuthRepository = authRepository) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async register(input: RegisterInput) {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) {
      throw new ConflictError('Email is already registered', 'EMAIL_ALREADY_REGISTERED');
    }

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_COST_FACTOR);

    const { user, organization } = await this.repo.createOrgWithAdminUser(
      input.email,
      passwordHash,
      input.fullName,
      input.organizationName
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      organization: {
        id: organization.id,
        name: organization.name,
      },
    };
  }

  async login(input: LoginInput): Promise<TokenResponse> {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    return this.generateTokenPair(user.id);
  }

  async refresh(input: RefreshInput): Promise<TokenResponse> {
    let payload: any;
    try {
      payload = jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET);
    } catch (_err) {
      throw new UnauthorizedError('Invalid or expired refresh token', 'TOKEN_EXPIRED');
    }

    const tokenHash = this.hashToken(input.refreshToken);
    const validToken = await this.repo.findValidRefreshToken(tokenHash);

    if (!validToken || validToken.userId !== payload.sub) {
      throw new UnauthorizedError('Refresh token revoked or invalid', 'TOKEN_EXPIRED');
    }

    // Refresh Token Rotation (bonus): revoke the used refresh token
    await this.repo.revokeRefreshToken(tokenHash);

    // Issue a fresh token pair
    return this.generateTokenPair(validToken.userId);
  }

  async logout(input: LogoutInput): Promise<void> {
    if (!input.refreshToken) {
      throw new ValidationError('Refresh token is required');
    }
    const tokenHash = this.hashToken(input.refreshToken);
    await this.repo.revokeRefreshToken(tokenHash);
  }

  private async generateTokenPair(userId: string): Promise<TokenResponse> {
    // Access token payload contains { sub: userId } only per ARCHITECTURE.md §8
    const accessToken = jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_TTL as any,
    });

    const refreshToken = jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_TTL as any,
    });

    const tokenHash = this.hashToken(refreshToken);

    // 7 days expiry for DB tracking
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.repo.storeRefreshToken(userId, tokenHash, expiresAt);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }
}

export const authService = new AuthService();
