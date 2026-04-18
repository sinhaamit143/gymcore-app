const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function injectSupaAdmin() {
  try {
    const existing = await prisma.user.findUnique({ where: { email: 'supa@gymcore.com' }});
    if (existing) {
      console.log('✅ SupaAdmin already exists.');
      return;
    }

    const defaultGym = await prisma.gym.findFirst();
    const supaHash = await bcrypt.hash('supa123', 10);
    const superAdminUser = await prisma.user.create({
      data: {
        name: 'Supa Admin Master',
        email: 'supa@gymcore.com',
        password: supaHash,
        role: 'SUPER_ADMIN',
        avatar: 'https://i.pravatar.cc/150?u=supa@gymcore.com',
        gymId: null
      }
    });
    console.log('✅ Injected SupaAdmin securely!');
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

injectSupaAdmin();
