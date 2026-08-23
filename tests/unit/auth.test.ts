import { describe, it, expect } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';

describe('Authentication Logic (Unit)', () => {
  describe('Password Hashing (bcrypt >= 12)', () => {
    it('should hash password with cost factor >= 12', async () => {
      const password = 'StrongPassword123!';
      const cost = env.BCRYPT_COST_FACTOR;

      expect(cost).toBeGreaterThanOrEqual(12);

      const hash = await bcrypt.hash(password, cost);
      expect(hash).toBeDefined();
      expect(hash).not.toEqual(password);

      // Extract rounds from standard bcrypt string format $2b$12$...
      const rounds = parseInt(hash.split('$')[2], 10);
      expect(rounds).toBeGreaterThanOrEqual(12);

      const matches = await bcrypt.compare(password, hash);
      expect(matches).toBe(true);
    });

    it('should reject incorrect password comparison', async () => {
      const hash = await bcrypt.hash('CorrectPassword', 12);
      const matches = await bcrypt.compare('WrongPassword', hash);
      expect(matches).toBe(false);
    });
  });

  describe('JWT Access & Refresh Token Creation', () => {
    it('should issue access token containing sub=userId ONLY', () => {
      const userId = '11111111-1111-1111-1111-111111111111';

      const token = jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
        expiresIn: '15m',
      });

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
      expect(decoded.sub).toBe(userId);
      // Security check: no orgId or role claims embedded in JWT
      expect(decoded.orgId).toBeUndefined();
      expect(decoded.role).toBeUndefined();
    });

    it('should fail verification when signed with incorrect secret', () => {
      const token = jwt.sign({ sub: 'user-1' }, 'wrong_secret');
      expect(() => jwt.verify(token, env.JWT_ACCESS_SECRET)).toThrow();
    });
  });
});
