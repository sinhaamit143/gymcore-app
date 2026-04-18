const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const g = await prisma.gym.findFirst();
  console.log('GYM_ID:' + g.id);
  
  const o = await prisma.user.findFirst({ where: { role: 'GYM_OWNER', gymId: g.id } });
  console.log('OWNER_EMAIL:' + o.email);
  
  const m = await prisma.user.findFirst({ where: { role: 'GYM_MEMBER', gymId: g.id } });
  console.log('MEMBER_EMAIL:' + m.email);
}

main().finally(() => prisma.$disconnect());
