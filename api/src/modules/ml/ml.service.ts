import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class MlService {
  private readonly mlServiceUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  }

  /**
   * Predict the pair collaboration state from extracted features.
   */
  async predictPairState(
    sessionId: string,
    features: Record<string, number>,
  ) {
    try {
      const response = await this.httpService
        .post(`${this.mlServiceUrl}/predict-pair-state`, {
          sessionId,
          features,
        })
        .toPromise();

      return response.data;
    } catch (error) {
      // Fallback if ML service unavailable
      return {
        sessionId,
        predictedState: 'PRODUCTIVE',
        confidence: 0.5,
        modelVersion: 'fallback_v1',
      };
    }
  }

  /**
   * Get an intervention recommendation based on predicted state.
   */
  async recommendIntervention(
    sessionId: string,
    predictedState: string,
    confidence: number,
  ) {
    try {
      const response = await this.httpService
        .post(`${this.mlServiceUrl}/recommend-intervention`, {
          sessionId,
          predictedState,
          confidence,
        })
        .toPromise();

      return response.data;
    } catch (error) {
      return {
        state: predictedState,
        action: 'NO_ACTION',
        delivery: {
          type: 'none',
          uiTarget: 'none',
          uiEffect: 'none',
          message: 'ML service unavailable',
        },
      };
    }
  }

  /**
   * Retrieve a RAG-based hint for logic struggle support.
   */
  async retrieveHint(
    sessionId: string,
    questionId: string,
    conceptTags: string[],
    errorContext: string,
  ) {
    try {
      const response = await this.httpService
        .post(`${this.mlServiceUrl}/retrieve-hint`, {
          sessionId,
          questionId,
          conceptTags,
          errorContext,
        })
        .toPromise();

      return response.data;
    } catch (error) {
      return {
        conceptReminder: 'Review the problem requirements carefully.',
        exampleIdea: 'Break down the problem into smaller steps.',
        reflectiveQuestion: 'What is the first step you need to take?',
      };
    }
  }
}
