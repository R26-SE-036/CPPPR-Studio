import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function seed50Sessions() {
  console.log('Seeding 50 mock sessions from JSON...');
  
  // Read JSON file
  const jsonPath = path.resolve(__dirname, '../../ml-service/data/raw_sessions/mock_training_sessions.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('JSON file not found at:', jsonPath);
    return;
  }
  
  const fileContent = fs.readFileSync(jsonPath, 'utf-8');
  const allSessions = JSON.parse(fileContent);
  
  // Take first 50 sessions
  const sessionsToSeed = allSessions.slice(0, 50);
  
  const questionId = 'array-bounds-question'; // existing question

  for (const sessionData of sessionsToSeed) {
    const sessionId = sessionData.sessionId;
    
    // Check if session exists to avoid duplicates
    const existing = await prisma.pairSession.findUnique({ where: { id: sessionId } });
    if (existing) {
      console.log(`Session ${sessionId} already exists, skipping...`);
      continue;
    }
    
    // Create session
    await prisma.pairSession.create({
      data: {
        id: sessionId,
        joinCode: `JOIN-${sessionId}`,
        questionId: questionId,
        status: 'COMPLETED',
        startedAt: new Date(sessionData.startTime),
        endedAt: new Date(sessionData.endTime),
      }
    });

    // Assume U001 is user1 and U002 is user2 (these are seeded in seeds.ts)
    await prisma.pairSessionMember.createMany({
      data: [
        { sessionId: sessionId, userId: 'user1', role: 'DRIVER' },
        { sessionId: sessionId, userId: 'user2', role: 'NAVIGATOR' }
      ]
    });

    // Process events
    const eventsToCreate = [];
    let baseTime = new Date(sessionData.startTime).getTime();
    
    for (const ev of sessionData.events) {
      // The mock generator gives timestamps like "S1000-00", meaning minute 0.
      // We need to parse the minute offset.
      let timestamp = new Date(baseTime);
      if (typeof ev.timestamp === 'string' && ev.timestamp.includes('-')) {
        const parts = ev.timestamp.split('-');
        const minOffset = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(minOffset)) {
          timestamp = new Date(baseTime + minOffset * 60000);
        }
      }
      
      const realUserId = ev.userId === 'U001' ? 'user1' : 'user2';
      const role = ev.role || (realUserId === 'user1' ? 'DRIVER' : 'NAVIGATOR'); // fallback

      eventsToCreate.push({
        sessionId: sessionId,
        userId: realUserId,
        role: role,
        eventType: ev.eventType,
        timestamp: timestamp,
        metadata: ev.metadata || {}
      });
    }

    if (eventsToCreate.length > 0) {
      await prisma.sessionEvent.createMany({
        data: eventsToCreate
      });
    }

    // Add a prediction for the final targetState
    await prisma.pairStatePrediction.create({
      data: {
        sessionId: sessionId,
        windowStart: new Date(new Date(sessionData.endTime).getTime() - 60000),
        windowEnd: new Date(sessionData.endTime),
        predictedState: sessionData.targetState || 'PRODUCTIVE',
        confidence: 0.95,
        modelVersion: 'mock_generator_v1'
      }
    });

    console.log(`Seeded session ${sessionId} with ${eventsToCreate.length} events (Target: ${sessionData.targetState})`);
  }

  console.log('✅ Successfully seeded 50 mock sessions!');
}

seed50Sessions()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
