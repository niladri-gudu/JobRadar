import { db } from '@repo/database';

export class ApplicationService {
  /**
   * Retrieves all application tracking records for a given user, including job & company details.
   */
  async getApplications(userId: string) {
    return db.application.findMany({
      where: { userId },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
      orderBy: {
        appliedAt: 'desc',
      },
    });
  }

  /**
   * Tracks a new application for a given jobId.
   */
  async createApplication(userId: string, jobId: string) {
    // Check if already tracked to prevent duplicates
    const existing = await db.application.findFirst({
      where: {
        userId,
        jobId,
      },
    });

    if (existing) {
      return existing;
    }

    return db.application.create({
      data: {
        userId,
        jobId,
        status: 'applied',
      },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
    });
  }

  /**
   * Updates status or notes for an application.
   */
  async updateApplication(userId: string, id: string, data: { status?: string; notes?: string }) {
    // Check ownership first
    const app = await db.application.findFirst({
      where: { id, userId },
    });
    if (!app) {
      throw new Error('Application tracking record not found or unauthorized');
    }

    return db.application.update({
      where: { id },
      data,
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
    });
  }

  /**
   * Deletes an application tracking record.
   */
  async deleteApplication(userId: string, id: string) {
    const app = await db.application.findFirst({
      where: { id, userId },
    });
    if (!app) {
      throw new Error('Application tracking record not found or unauthorized');
    }

    return db.application.delete({
      where: { id },
    });
  }
}
