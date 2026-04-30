import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedDatabase() {
  // Create sample topics
  const arraysTopic = await prisma.topic.create({
    data: {
      id: 'arrays-topic',
      name: 'Arrays and Indexing',
      description: 'Working with Java arrays, indexing, and bounds checking',
    },
  });

  const loopsTopic = await prisma.topic.create({
    data: {
      id: 'loops-topic',
      name: 'Loops and Iteration',
      description: 'For loops, while loops, and iteration patterns',
    },
  });

  const conditionsTopic = await prisma.topic.create({
    data: {
      id: 'conditions-topic',
      name: 'Conditions and Logic',
      description: 'If-else statements and conditional logic',
    },
  });

  // Create sample questions
  const question1 = await prisma.question.create({
    data: {
      id: 'array-bounds-question',
      title: 'Array Bounds Checking',
      description: 'Write a Java program that demonstrates proper array bounds checking.',
      difficulty: 'BEGINNER',
      topicId: arraysTopic.id,
      starterCode: `public class ArrayBounds {
    public static void main(String[] args) {
        int[] numbers = {1, 2, 3, 4, 5};
        // TODO: Print all elements with proper bounds checking
    }
}`,
      referenceSolution: `public class ArrayBounds {
    public static void main(String[] args) {
        int[] numbers = {1, 2, 3, 4, 5};
        // Proper bounds checking
        for (int i = 0; i < numbers.length; i++) {
            System.out.println("Element at index " + i + ": " + numbers[i]);
        }
    }
}`,
      conceptTags: ['arrays', 'indexing', 'bounds'],
      reviewQuestions: [
        'Did we check array bounds before accessing elements?',
        'Did we use the correct loop condition?',
        'Did we handle edge cases properly?',
        'Did we test with different array sizes?',
        'Did we understand zero-based indexing?',
        'Did we use proper variable names?',
        'Did we follow Java coding conventions?',
        'Did we add comments where necessary?',
        'Did we test our solution?',
        'Did we consider alternative approaches?'
      ],
    },
  });

  const question2 = await prisma.question.create({
    data: {
      id: 'loop-sum-question',
      title: 'Sum of Array Elements',
      description: 'Write a Java program that calculates the sum of all elements in an array.',
      difficulty: 'BEGINNER',
      topicId: loopsTopic.id,
      starterCode: `public class ArraySum {
    public static void main(String[] args) {
        int[] numbers = {1, 2, 3, 4, 5};
        int sum = 0;
        // TODO: Calculate sum of all elements
    }
}`,
      referenceSolution: `public class ArraySum {
    public static void main(String[] args) {
        int[] numbers = {1, 2, 3, 4, 5};
        int sum = 0;
        // Calculate sum using for loop
        for (int i = 0; i < numbers.length; i++) {
            sum += numbers[i];
        }
        System.out.println("Sum: " + sum);
    }
}`,
      conceptTags: ['arrays', 'loops', 'iteration'],
      reviewQuestions: [
        'Did we initialize the sum variable correctly?',
        'Did we use the correct loop condition?',
        'Did we accumulate the sum properly?',
        'Did we handle empty arrays?',
        'Did we test with different values?',
        'Did we use meaningful variable names?',
        'Did we follow Java coding conventions?',
        'Did we add comments where necessary?',
        'Did we test our solution?',
        'Did we consider using enhanced for loops?'
      ],
    },
  });

  const question3 = await prisma.question.create({
    data: {
      id: 'conditional-logic-question',
      title: 'Even or Odd Number',
      description: 'Write a Java program that determines if a number is even or odd.',
      difficulty: 'BEGINNER',
      topicId: conditionsTopic.id,
      starterCode: `public class EvenOdd {
    public static void main(String[] args) {
        int number = 7;
        // TODO: Determine if number is even or odd
    }
}`,
      referenceSolution: `public class EvenOdd {
    public static void main(String[] args) {
        int number = 7;
        // Use modulo operator to check even/odd
        if (number % 2 == 0) {
            System.out.println(number + " is even");
        } else {
            System.out.println(number + " is odd");
        }
    }
}`,
      conceptTags: ['conditions', 'modulo', 'logic'],
      reviewQuestions: [
        'Did we use the correct conditional operator?',
        'Did we handle both even and odd cases?',
        'Did we use the modulo operator correctly?',
        'Did we test with different numbers?',
        'Did we consider negative numbers?',
        'Did we use meaningful variable names?',
        'Did we follow Java coding conventions?',
        'Did we add comments where necessary?',
        'Did we test our solution?',
        'Did we consider edge cases like zero?'
      ],
    },
  });

  // Create sample users
  const hashedPassword1 = await bcrypt.hash('password123', 10);
  const hashedPassword2 = await bcrypt.hash('password456', 10);

  await prisma.user.create({
    data: {
      id: 'user1',
      email: 'IT12345678@my.sliit.lk',
      password: hashedPassword1,
      firstName: 'John',
      lastName: 'Doe',
    },
  });

  await prisma.user.create({
    data: {
      id: 'user2',
      email: 'IT87654321@my.sliit.lk',
      password: hashedPassword2,
      firstName: 'Jane',
      lastName: 'Smith',
    },
  });

  // --- ML Mock Data ---
  await seedMLData(prisma, question1.id);

  console.log('Database seeded successfully!');
}

async function seedMLData(prisma: PrismaClient, questionId: string) {
  console.log('Seeding ML mock data...');
  
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

seedDatabase()
  .catch((e) => {
    console.error('Error seeding database:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
