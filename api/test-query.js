const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Running query...");
  const sessions = await prisma.pairSession.findMany({
    where: {
      predictions: {
        some: {}
      }
    },
    select: {
      id: true,
      status: true,
      startedAt: true,
      endedAt: true,
      predictions: {
        orderBy: { windowEnd: 'desc' },
        take: 1
      }
    },
    orderBy: {
      startedAt: 'desc'
    }
  });
  console.log("Found sessions:", sessions.length);
  if (sessions.length > 0) {
    console.log(sessions[0]);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
