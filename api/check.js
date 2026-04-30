const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Sessions:', await prisma.pairSession.count());
  console.log('Events:', await prisma.sessionEvent.count());
  console.log('Interventions:', await prisma.intervention.count());
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
