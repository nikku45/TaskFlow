import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';
import { request } from '../setup/testServer';

// Mock DB queries for cross-tenant isolation testing
vi.mock('../../src/database/prisma', () => ({
  prisma: {
    orgMember: {
      findFirst: vi.fn().mockImplementation(({ where }) => {
        // User A belongs to Org A, User B belongs to Org B
        if (where.userId === 'user-org-b-id') {
          return Promise.resolve({
            id: 'mem-b',
            orgId: 'org-b-id',
            userId: 'user-org-b-id',
            role: 'member',
          });
        }
        return Promise.resolve({
          id: 'mem-a',
          orgId: 'org-a-id',
          userId: 'user-org-a-id',
          role: 'org_admin',
        });
      }),
    },
    project: {
      findFirst: vi.fn().mockImplementation(({ where }) => {
        // Only return if project belongs to caller's org
        if (where.id === 'proj-org-a-id' && where.orgId === 'org-a-id') {
          return Promise.resolve({
            id: 'proj-org-a-id',
            orgId: 'org-a-id',
            name: 'Acme Secret Project',
          });
        }
        // Cross-tenant access attempt returns null
        return Promise.resolve(null);
      }),
    },
    task: {
      findFirst: vi.fn().mockImplementation(({ where }) => {
        if (where.id === 'task-org-a-id' && where.project?.orgId === 'org-a-id') {
          return Promise.resolve({
            id: 'task-org-a-id',
            projectId: 'proj-org-a-id',
            title: 'Acme Confidential Task',
          });
        }
        return Promise.resolve(null);
      }),
    },
  },
}));

describe('Multi-Tenant Cross-Tenant Security Isolation (Integration)', () => {
  const tokenOrgB = jwt.sign({ sub: 'user-org-b-id' }, env.JWT_ACCESS_SECRET);

  it('should return 403 Forbidden when Org B user attempts GET /projects/:id of Org A', async () => {
    const res = await request
      .get('/api/v1/projects/proj-org-a-id')
      .set('Authorization', `Bearer ${tokenOrgB}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    // Verify no Org A project data is returned or leaked
    expect(res.body).not.toHaveProperty('name');
    expect(res.body).not.toHaveProperty('orgId');
  });

  it('should return 403 Forbidden when Org B user attempts GET /tasks/:id of Org A', async () => {
    const res = await request
      .get('/api/v1/tasks/task-org-a-id')
      .set('Authorization', `Bearer ${tokenOrgB}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(res.body).not.toHaveProperty('title');
  });

  it('should return 403 Forbidden when Org B user attempts POST /tasks/:id/assign on Org A task', async () => {
    const res = await request
      .post('/api/v1/tasks/task-org-a-id/assign')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({ userId: '00000000-0000-0000-0000-000000000001' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});
