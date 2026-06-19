import { db } from '@repo/database';
import { PDFParse } from 'pdf-parse';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../../config';
import fs from 'fs/promises';
import path from 'path';

export class ResumeService {
  private s3Client: S3Client | null = null;

  constructor() {
    if (
      config.r2.accountId &&
      config.r2.accessKeyId &&
      config.r2.secretAccessKey &&
      config.r2.bucketName
    ) {
      this.s3Client = new S3Client({
        endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.r2.accessKeyId,
          secretAccessKey: config.r2.secretAccessKey,
        },
        region: 'auto',
        forcePathStyle: true,
      });
    }
  }

  /**
   * Parses the text out of a PDF buffer.
   */
  async parsePdf(buffer: Buffer): Promise<string> {
    try {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const textResult = await parser.getText();
      const text = textResult.text;
      await parser.destroy(); // Clean up worker/canvas resources
      return text || '';
    } catch (error: any) {
      console.error('Failed parsing PDF:', error);
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  /**
   * Saves the uploaded PDF file. If Cloudflare R2 is configured, uploads to R2.
   * Otherwise, falls back to local disk storage.
   */
  async saveResumeFile(userId: string, filename: string, buffer: Buffer): Promise<string> {
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const destFilename = `${userId}_${cleanFilename}`;

    if (this.s3Client && config.r2.bucketName) {
      try {
        const key = `resumes/${destFilename}`;
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: config.r2.bucketName,
            Key: key,
            Body: buffer,
            ContentType: 'application/pdf',
          })
        );

        if (config.r2.publicUrl) {
          const base = config.r2.publicUrl.endsWith('/')
            ? config.r2.publicUrl.slice(0, -1)
            : config.r2.publicUrl;
          return `${base}/${key}`;
        }

        return `https://${config.r2.bucketName}.${config.r2.accountId}.r2.cloudflarestorage.com/${key}`;
      } catch (error: any) {
        console.error('R2 upload failed, falling back to local storage:', error);
      }
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'resumes');
    await fs.mkdir(uploadDir, { recursive: true });
    const destPath = path.join(uploadDir, destFilename);

    await fs.writeFile(destPath, buffer);
    return `/uploads/resumes/${destFilename}`;
  }

  /**
   * Upserts the parsed resume data in the database.
   */
  async upsertResume(userId: string, fileUrl: string, parsedText: string) {
    return db.resume.upsert({
      where: { userId },
      create: {
        userId,
        fileUrl,
        parsedText,
      },
      update: {
        fileUrl,
        parsedText,
      },
    });
  }

  /**
   * Retrieves the resume record for a given user.
   */
  async getResume(userId: string) {
    return db.resume.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        fileUrl: true,
        parsedText: true,
        createdAt: true,
      },
    });
  }
}
