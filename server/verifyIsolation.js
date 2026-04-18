const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    const supa = await prisma.user.findUnique({ where: { email: 'supa@gymcore.com' } });
    console.log('--- Super Admin Status ---');
    console.log('Email:', supa?.email);
    console.log('Role:', supa?.role);
    console.log('GymID:', supa?.gymId);
    
    const owner = await prisma.user.findUnique({ where: { email: 'admin@gymcore.com' } });
    console.log('\n--- Gym Owner Status ---');
    console.log('Email:', owner?.email);
    console.log('GymID:', owner?.gymId);

    if (owner && owner.gymId) {
      const membersInOwnerGym = await prisma.user.findMany({
        where: { gymId: owner.gymId }
      });
      console.log(`\n--- Users in Owner Gym (${owner.gymId}) ---`);
      membersInOwnerGym.forEach(u => console.log(`- ${u.email} [${u.role}]`));
      
      const containsSupa = membersInOwnerGym.some(u => u.role === 'SUPER_ADMIN');
      console.log('\nIs Super Admin in this list?', containsSupa ? '❌ YES (FAILURE)' : '✅ NO (SUCCESS)');
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
