import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';

@Injectable()
export class MongoDbService implements OnModuleInit, OnModuleDestroy {
  private client: MongoClient;
  private db: Db;
  private dbName = 'pairprogramming_ml';

  async onModuleInit() {
    try {
      const uri = process.env.MONGODB_URI //|| 'mongodb://localhost:27017';
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error('MongoDB connection error:', error);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
      console.log('MongoDB disconnected');
    }
  }

  // ML event logging
  async logMLEvent(sessionId: string, event: any): Promise<void> {
    const collection = this.db.collection('ml_events');
    const logEntry = {
      timestamp: new Date(),
      sessionId,
      ...event
    };
    await collection.insertOne(logEntry);
  }

  async getSessionMLEvents(sessionId: string, limit: number = 100): Promise<any[]> {
    const collection = this.db.collection('ml_events');
    return await collection.find({ sessionId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  // Feature data storage for training
  async storeSessionFeatures(sessionId: string, features: any): Promise<void> {
    const collection = this.db.collection('session_features');
    const featureEntry = {
      sessionId,
      features,
      timestamp: new Date(),
      extractedAt: new Date()
    };
    await collection.updateOne(
      { sessionId },
      { $set: featureEntry },
      { upsert: true }
    );
  }

  async getSessionFeatures(sessionId: string): Promise<any> {
    const collection = this.db.collection('session_features');
    const result = await collection.findOne({ sessionId });
    return result ? result.features : null;
  }

  // Model performance tracking
  async logModelPerformance(modelVersion: string, metrics: any): Promise<void> {
    const collection = this.db.collection('model_performance');
    const performanceEntry = {
      modelVersion,
      metrics,
      timestamp: new Date()
    };
    await collection.insertOne(performanceEntry);
  }

  async getModelPerformanceHistory(limit: number = 50): Promise<any[]> {
    const collection = this.db.collection('model_performance');
    return await collection.find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  // Intervention tracking
  async logIntervention(sessionId: string, intervention: any): Promise<void> {
    const collection = this.db.collection('interventions');
    const interventionEntry = {
      sessionId,
      intervention,
      timestamp: new Date()
    };
    await collection.insertOne(interventionEntry);
  }

  async getSessionInterventions(sessionId: string): Promise<any[]> {
    const collection = this.db.collection('interventions');
    return await collection.find({ sessionId })
      .sort({ timestamp: -1 })
      .toArray();
  }

  // Training data management
  async storeTrainingData(trainingData: any[]): Promise<void> {
    const collection = this.db.collection('training_data');
    const dataEntry = {
      data: trainingData,
      timestamp: new Date(),
      version: 'v1.0'
    };
    await collection.insertOne(dataEntry);
  }

  async getTrainingData(version?: string): Promise<any> {
    const collection = this.db.collection('training_data');
    const query = version ? { version } : {};
    const result = await collection.findOne(query, { sort: { timestamp: -1 } });
    return result ? result.data : null;
  }

  // Analytics and reporting
  async getCollaborationStats(timeRange: { start: Date, end: Date }): Promise<any> {
    const collection = this.db.collection('ml_events');
    const pipeline = [
      {
        $match: {
          timestamp: { $gte: timeRange.start, $lte: timeRange.end }
        }
      },
      {
        $group: {
          _id: '$sessionId',
          totalEvents: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' },
          interventionCount: { $sum: { $cond: [{ $gt: ['$interventionType', null] }, 1, 0] } }
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: '$totalEvents' },
          avgConfidence: { $avg: '$avgConfidence' },
          totalInterventions: { $sum: '$interventionCount' }
        }
      }
    ];
    
    const result = await collection.aggregate(pipeline).toArray();
    return result.length > 0 ? result[0] : {
      totalSessions: 0,
      avgConfidence: 0,
      totalInterventions: 0
    };
  }
}
