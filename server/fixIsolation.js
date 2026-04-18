const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixIsolation() {
  try {
    const supaAdmin = await prisma.user.findUnique({ where: { email: 'supa@gymcore.com' } });
    if (supaAdmin) {
      await prisma.user.update({
        where: { email: 'supa@gymcore.com' },
        data: { gymId: null }
      });
      console.log('✅ SupaAdmin detached from default gym successfully!');
    } else {
      console.log('⚠️ SupaAdmin not found. Run standard seeder.');
    }
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

fixIsolation();
