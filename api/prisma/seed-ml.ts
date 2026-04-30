import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedMLData() {
  console.log('Seeding ML mock data...');
  const questionId = 'array-bounds-question'; // existing seeded question
  
  // Clean up existing ML mock sessions if any
  await prisma.pairSession.deleteMany({
    where: {
      id: {
        in: ['mock-session-productive', 'mock-session-driver-dom']
      }
    }
  });

  // Create a Productive Session
  const session1 = await prisma.pairSession.create({
    data: {
      id: 'mock-session-productive',
      joinCode: 'PROD-123',
      questionId: questionId,
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 30 * 60000), // 30 mins ago
      endedAt: new Date(),
    }
  });

  await prisma.pairSessionMember.createMany({
    data: [
      { sessionId: session1.id, userId: 'user1', role: 'DRIVER' },
      { sessionId: session1.id, userId: 'user2', role: 'NAVIGATOR' }
    ]
  });

  // Add some events
  await prisma.sessionEvent.createMany({
    data: [
      { sessionId: session1.id, userId: 'user1', role: 'DRIVER', eventType: 'CODE_EDIT', timestamp: new Date(Date.now() - 28 * 60000), metadata: { linesAdded: 5 } },
      { sessionId: session1.id, userId: 'user2', role: 'NAVIGATOR', eventType: 'DISCUSSION_NOTE', timestamp: new Date(Date.now() - 27 * 60000), metadata: { content: 'Looks good' } },
      { sessionId: session1.id, userId: 'user1', role: 'DRIVER', eventType: 'ROLE_SWITCH', timestamp: new Date(Date.now() - 20 * 60000), metadata: {} }
    ]
  });

  // Add Feature Windows
  await prisma.featureWindow.create({
    data: {
      sessionId: session1.id,
      windowStart: new Date(Date.now() - 28 * 60000),
      windowEnd: new Date(Date.now() - 27 * 60000),
      features: {
        user1_edit_count_1m: 10,
        user2_edit_count_1m: 8,
        edit_balance_ratio_1m: 0.8,
        run_attempts_1m: 1,
        run_success_rate_1m: 1.0,
        idle_ratio_1m: 0.1,
        discussion_note_count_1m: 2
      }
    }
  });

  // Add Prediction
  await prisma.pairStatePrediction.create({
    data: {
      sessionId: session1.id,
      windowStart: new Date(Date.now() - 28 * 60000),
      windowEnd: new Date(Date.now() - 27 * 60000),
      predictedState: 'PRODUCTIVE',
      confidence: 0.92,
      modelVersion: 'pair_state_xgboost_v1'
    }
  });

  // Create a Driver Dominance Session
  const session2 = await prisma.pairSession.create({
    data: {
      id: 'mock-session-driver-dom',
      joinCode: 'DOM-123',
      questionId: questionId,
      status: 'ACTIVE',
      startedAt: new Date(Date.now() - 15 * 60000), // 15 mins ago
    }
  });

  await prisma.pairSessionMember.createMany({
    data: [
      { sessionId: session2.id, userId: 'user1', role: 'DRIVER' },
      { sessionId: session2.id, userId: 'user2', role: 'NAVIGATOR' }
    ]
  });

  // Add Prediction and Intervention
  await prisma.pairStatePrediction.create({
    data: {
      sessionId: session2.id,
      windowStart: new Date(Date.now() - 5 * 60000),
      windowEnd: new Date(Date.now() - 4 * 60000),
      predictedState: 'DRIVER_DOMINANCE',
      confidence: 0.88,
      modelVersion: 'pair_state_xgboost_v1'
    }
  });

  await prisma.intervention.create({
    data: {
      sessionId: session2.id,
      state: 'DRIVER_DOMINANCE',
      action: 'ROLE_SWITCH_SUPPORT',
      uiTarget: 'role_switch_button',
      uiEffect: 'glow',
      message: 'You have been in the same roles for a while. Consider switching Driver and Navigator.',
      shownAt: new Date()
    }
  });
  
  console.log('ML mock data seeded successfully!');
}

seedMLData()
  .catch((e) => {
    console.error('Error seeding ML database:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
