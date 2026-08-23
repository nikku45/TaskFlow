import { describe, it, expect } from 'vitest';
import { request } from '../setup/testServer';

describe('API Input Validation & Error Format (Integration)', () => {
  it('should return 400 VALIDATION_ERROR with required shape on invalid register payload', async () => {
    const res = await request
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email-format',
        // missing password, fullName, organizationName
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(res.body).toHaveProperty('details');
  });

  it('should return 401 UNAUTHORIZED on protected route without Bearer token', async () => {
    const res = await request.get('/api/v1/projects');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('code', 'UNAUTHORIZED');
  });
});
