import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  async onModuleInit() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      }) as RedisClientType;

      await this.client.connect();
      console.log('Redis connected successfully');
    } catch (error: any) {
      console.error('Redis connection error:', error.message);
    }
  }

  async onModuleDestroy() {
    await this.client.disconnect();
    console.log('Redis disconnected');
  }

  // Session state management
  async setSessionState(sessionId: string, state: any): Promise<void> {
    await this.client.set(`session:${sessionId}`, JSON.stringify(state), {
      EX: 3600, // 1 hour expiry
    });
  }

  async getSessionState(sessionId: string): Promise<any> {
    const state = await this.client.get(`session:${sessionId}`);
    return state ? JSON.parse(state as string) : null;
  }

  async deleteSessionState(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }

  // User presence management
  async setUserOnline(userId: string, sessionId: string): Promise<void> {
    await this.client.set(`user:${userId}:online`, sessionId, {
      EX: 300, // 5 minutes expiry
    });
  }

  async setUserOffline(userId: string): Promise<void> {
    await this.client.del(`user:${userId}:online`);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const result = await this.client.get(`user:${userId}:online`);
    return result !== null;
  }

  // Real-time collaboration metrics
  async incrementMetric(sessionId: string, metric: string, value: number = 1): Promise<void> {
    for (let i = 0; i < value; i++) {
      await this.client.incr(`session:${sessionId}:metric:${metric}`);
    }
  }

  async getMetric(sessionId: string, metric: string): Promise<number> {
    const result = await this.client.get(`session:${sessionId}:metric:${metric}`);
    return result ? parseInt(result as string, 10) : 0;
  }

  // Intervention cooldown management
  async setInterventionCooldown(sessionId: string, interventionType: string): Promise<void> {
    await this.client.set(
      `session:${sessionId}:intervention:${interventionType}`,
      '1',
      { EX: 300 },
    );
  }

  async canShowIntervention(sessionId: string, interventionType: string): Promise<boolean> {
    const result = await this.client.get(`session:${sessionId}:intervention:${interventionType}`);
    return result === null;
  }

  // Event logging
  async logEvent(sessionId: string, event: any): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      sessionId,
      ...event
    };
    
    await this.client.lPush(`session:${sessionId}:events`, JSON.stringify(logEntry));
    
    // Keep only last 100 events
    await this.client.lTrim(`session:${sessionId}:events`, 0, 99);
  }

  async getSessionEvents(sessionId: string): Promise<any[]> {
    const events = await this.client.lRange(`session:${sessionId}:events`, 0, -1);
    return events.map(event => JSON.parse(event));
  }
}
