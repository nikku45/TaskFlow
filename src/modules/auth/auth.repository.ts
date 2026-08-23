import { prisma } from '../../database/prisma';
import { OrgRole, Organization, User } from '@prisma/client';

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async createOrgWithAdminUser(
    email: string,
    passwordHash: string,
    fullName: string,
    organizationName: string
  ): Promise<{ user: User; organization: Organization }> {
    return prisma.$transaction(async (tx) => {
      // Look up existing organization by name (case-insensitive)
      let organization = await tx.organization.findFirst({
        where: { name: { equals: organizationName, mode: 'insensitive' } },
      });

      let role: OrgRole = OrgRole.member;

      if (!organization) {
        organization = await tx.organization.create({
          data: { name: organizationName },
        });
        role = OrgRole.org_admin;
      }

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName,
        },
      });

      await tx.orgMember.create({
        data: {
          orgId: organization.id,
          userId: user.id,
          role,
        },
      });

      return { user, organization };
    });
  }

  async storeRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findValidRefreshToken(tokenHash: string) {
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });
    return tokenRecord;
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const authRepository = new AuthRepository();
