import { PrismaClient, TaskStatus, TaskPriority, OrgRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_COST = 12;
const SEED_PASSWORD = 'Password123!';

async function main() {
  console.log('🌱 Seeding TaskFlow database...');

  // Hash the shared seed password
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_COST);

  // --- Organizations ---
  const orgA = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Acme Corp',
    },
  });
  const orgB = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Globex Inc',
    },
  });
  console.log(`  ✅ 2 organizations: ${orgA.name}, ${orgB.name}`);

  // --- Users ---
  const users = [
    { id: '00000000-0000-0000-0001-000000000001', email: 'alice@acme.com', fullName: 'Alice Admin', org: orgA, role: OrgRole.org_admin },
    { id: '00000000-0000-0000-0001-000000000002', email: 'bob@acme.com', fullName: 'Bob Member', org: orgA, role: OrgRole.member },
    { id: '00000000-0000-0000-0001-000000000003', email: 'charlie@acme.com', fullName: 'Charlie Member', org: orgA, role: OrgRole.member },
    { id: '00000000-0000-0000-0001-000000000004', email: 'diana@globex.com', fullName: 'Diana Admin', org: orgB, role: OrgRole.org_admin },
    { id: '00000000-0000-0000-0001-000000000005', email: 'eve@globex.com', fullName: 'Eve Member', org: orgB, role: OrgRole.member },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        email: u.email,
        passwordHash,
        fullName: u.fullName,
      },
    });

    // Create org membership
    await prisma.orgMember.upsert({
      where: {
        orgId_userId: { orgId: u.org.id, userId: u.id },
      },
      update: {},
      create: {
        orgId: u.org.id,
        userId: u.id,
        role: u.role,
      },
    });
  }
  console.log(`  ✅ 5 users created with memberships`);

  // --- Projects ---
  const projects = [
    { id: '00000000-0000-0000-0002-000000000001', orgId: orgA.id, name: 'Website Revamp', description: 'Q3 website redesign project' },
    { id: '00000000-0000-0000-0002-000000000002', orgId: orgA.id, name: 'Mobile App', description: 'React Native mobile app development' },
    { id: '00000000-0000-0000-0002-000000000003', orgId: orgB.id, name: 'Data Pipeline', description: 'ETL pipeline for analytics' },
    { id: '00000000-0000-0000-0002-000000000004', orgId: orgB.id, name: 'API Gateway', description: 'Internal API gateway service' },
  ];

  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    });
  }
  console.log(`  ✅ ${projects.length} projects created`);

  // --- Tasks (10+ spread across statuses and priorities) ---
  const tasks = [
    // Acme Corp - Website Revamp
    { id: '00000000-0000-0000-0003-000000000001', projectId: projects[0].id, title: 'Design homepage mockup', description: 'Create Figma mockup for new homepage', status: TaskStatus.done, priority: TaskPriority.high, dueDate: new Date('2026-09-01') },
    { id: '00000000-0000-0000-0003-000000000002', projectId: projects[0].id, title: 'Implement responsive nav', description: 'Build responsive navigation component', status: TaskStatus.in_progress, priority: TaskPriority.medium, dueDate: new Date('2026-09-15') },
    { id: '00000000-0000-0000-0003-000000000003', projectId: projects[0].id, title: 'SEO audit', description: 'Run full SEO audit on current site', status: TaskStatus.todo, priority: TaskPriority.low, dueDate: new Date('2026-10-01') },
    { id: '00000000-0000-0000-0003-000000000004', projectId: projects[0].id, title: 'Performance optimization', description: 'Optimize Core Web Vitals', status: TaskStatus.review, priority: TaskPriority.urgent, dueDate: new Date('2026-09-10') },

    // Acme Corp - Mobile App
    { id: '00000000-0000-0000-0003-000000000005', projectId: projects[1].id, title: 'Setup React Native project', description: 'Initialize RN project with TypeScript template', status: TaskStatus.done, priority: TaskPriority.high },
    { id: '00000000-0000-0000-0003-000000000006', projectId: projects[1].id, title: 'Auth screens', description: 'Login and registration screens', status: TaskStatus.in_progress, priority: TaskPriority.high, dueDate: new Date('2026-09-20') },
    { id: '00000000-0000-0000-0003-000000000007', projectId: projects[1].id, title: 'Push notifications', description: 'Integrate Firebase Cloud Messaging', status: TaskStatus.todo, priority: TaskPriority.medium },

    // Globex Inc - Data Pipeline
    { id: '00000000-0000-0000-0003-000000000008', projectId: projects[2].id, title: 'Design data schema', description: 'Define schema for analytics tables', status: TaskStatus.done, priority: TaskPriority.urgent },
    { id: '00000000-0000-0000-0003-000000000009', projectId: projects[2].id, title: 'Build ingestion service', description: 'Kafka consumer for raw events', status: TaskStatus.in_progress, priority: TaskPriority.high, dueDate: new Date('2026-09-25') },
    { id: '00000000-0000-0000-0003-000000000010', projectId: projects[2].id, title: 'Dashboard queries', description: 'SQL views for analytics dashboard', status: TaskStatus.todo, priority: TaskPriority.medium },

    // Globex Inc - API Gateway
    { id: '00000000-0000-0000-0003-000000000011', projectId: projects[3].id, title: 'Rate limiting middleware', description: 'Implement token bucket rate limiter', status: TaskStatus.review, priority: TaskPriority.high, dueDate: new Date('2026-09-12') },
    { id: '00000000-0000-0000-0003-000000000012', projectId: projects[3].id, title: 'Service discovery integration', description: 'Integrate with Consul for service discovery', status: TaskStatus.todo, priority: TaskPriority.low },
  ];

  for (const t of tasks) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: t,
    });
  }
  console.log(`  ✅ ${tasks.length} tasks created across all statuses and priorities`);

  // --- Task Assignments (same org only) ---
  const assignments = [
    // Acme assignments
    { taskId: tasks[0].id, userId: users[0].id },  // Alice assigned to Design homepage
    { taskId: tasks[1].id, userId: users[1].id },  // Bob assigned to Responsive nav
    { taskId: tasks[3].id, userId: users[0].id },  // Alice assigned to Perf optimization
    { taskId: tasks[5].id, userId: users[2].id },  // Charlie assigned to Auth screens
    // Globex assignments
    { taskId: tasks[8].id, userId: users[3].id },  // Diana assigned to Build ingestion
    { taskId: tasks[10].id, userId: users[4].id }, // Eve assigned to Rate limiting
  ];

  for (const a of assignments) {
    await prisma.taskAssignment.upsert({
      where: {
        taskId_userId: { taskId: a.taskId, userId: a.userId },
      },
      update: {},
      create: {
        taskId: a.taskId,
        userId: a.userId,
        notificationStatus: 'completed',
      },
    });
  }
  console.log(`  ✅ ${assignments.length} task assignments created`);

  // --- Comments ---
  const comments = [
    { taskId: tasks[0].id, authorId: users[1].id, body: 'Looking great! Just a few tweaks needed on the hero section.' },
    { taskId: tasks[0].id, authorId: users[0].id, body: 'Updated the hero — please review again.' },
    { taskId: tasks[1].id, authorId: users[1].id, body: 'Having trouble with the mobile menu animation. Any suggestions?' },
    { taskId: tasks[3].id, authorId: users[2].id, body: 'CLS score is still above threshold. Need to lazy-load images.' },
    { taskId: tasks[8].id, authorId: users[3].id, body: 'Kafka consumer lag is within acceptable range now.' },
    { taskId: tasks[10].id, authorId: users[4].id, body: 'Token bucket implementation is ready for review.' },
  ];

  for (const c of comments) {
    // Use create (not upsert) since comments don't have a natural unique key
    await prisma.comment.create({
      data: c,
    });
  }
  console.log(`  ✅ ${comments.length} comments created`);

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Seeded credentials (for local testing only):');
  console.log('   All users share password: Password123!');
  console.log('   Acme Corp users: alice@acme.com (admin), bob@acme.com, charlie@acme.com');
  console.log('   Globex Inc users: diana@globex.com (admin), eve@globex.com');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
