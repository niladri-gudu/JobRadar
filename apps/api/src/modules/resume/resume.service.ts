import { db } from '@repo/database';
import { PDFParse } from 'pdf-parse';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../../config';
import fs from 'fs/promises';
import path from 'path';
import { extractSkills } from '../job/job.service';

export interface AIResumeProfile {
  isValidDeveloperResume: boolean;
  skills: string[];
  experienceLevel: 'junior' | 'mid' | 'senior' | 'lead';
  roles: string[];
  reasoning: string;
}

export interface StoredResumeJson {
  rawText: string;
  aiProfile: AIResumeProfile;
}


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
   * Calls Google Gemini API to analyze the resume.
   */
  async analyzeResumeWithGemini(rawText: string): Promise<AIResumeProfile> {
    const apiKey = config.ai.geminiApiKey;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const model = config.ai.model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `You are an AI assistant specialized in developer resume parsing and verification.
Analyze the following text extracted from an uploaded document.

Document Text:
"""
${rawText}
"""

Determine if this is a valid software developer, software engineer, web developer, data engineer, devops, or technology professional resume.
For example, if the document is an identity card, Aadhar card, passport, driver's license, school/college marksheet, utility bill, or a completely non-technical resume (like pure marketing, sales, hospitality, HR, writer, etc.), it is NOT a valid developer resume.

Output a JSON response in the following format:
{
  "isValidDeveloperResume": boolean,
  "skills": string[],
  "experienceLevel": "junior" | "mid" | "senior" | "lead",
  "roles": string[],
  "reasoning": string
}

Rules for JSON values:
- isValidDeveloperResume: true if this is indeed a technology/software developer/engineer resume or contains developer work history. Otherwise false.
- skills: an array of lowercase strings representing normalized technology names found in the resume (e.g. "javascript", "typescript", "nodejs", "postgres", "react", "golang", "go", "python", "aws", "git", "rust"). Ensure it only contains developer and infrastructure skills.
- experienceLevel: best fit based on keywords or years of experience.
- roles: array of roles like "backend", "frontend", "fullstack", "devops", "web3", "data-engineer", etc.
- reasoning: a concise 1-2 sentence explanation of why the document was categorized this way and what profile was found.

Output ONLY valid JSON. No other text or markdown wrappers.`;

    let lastError: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          const err = new Error(`Gemini API error (${response.status}): ${errorText}`);
          (err as any).status = response.status;
          throw err;
        }

        const result = (await response.json()) as any;
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('Gemini API returned empty response');
        }

        return JSON.parse(text.trim());
      } catch (error: any) {
        lastError = error;
        if (error.status === 429 || error.status === 503 || error.message?.includes('503') || error.message?.includes('429')) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`Gemini API busy (status ${error.status}). Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError || new Error('Gemini API call failed after retries');
  }

  /**
   * Local programmatic fallback analyzer.
   */
  analyzeResumeProgrammatic(rawText: string): AIResumeProfile {
    const skills = extractSkills(rawText);
    const cleanText = rawText.toLowerCase();

    // If the document has zero developer skills, it's not a valid developer resume
    const isValidDeveloperResume = skills.length > 0;

    let experienceLevel: 'junior' | 'mid' | 'senior' | 'lead' = 'mid';
    if (cleanText.includes('senior') || cleanText.includes('sr.') || cleanText.includes('lead') || cleanText.includes('architect') || cleanText.includes('principal')) {
      experienceLevel = 'senior';
    } else if (cleanText.includes('junior') || cleanText.includes('jr.') || cleanText.includes('intern') || cleanText.includes('entry level') || cleanText.includes('fresher') || cleanText.includes('student')) {
      experienceLevel = 'junior';
    }

    const roles: string[] = [];
    if (cleanText.includes('backend') || cleanText.includes('back-end')) roles.push('backend');
    if (cleanText.includes('frontend') || cleanText.includes('front-end')) roles.push('frontend');
    if (cleanText.includes('fullstack') || cleanText.includes('full stack')) roles.push('fullstack');
    if (cleanText.includes('devops') || cleanText.includes('infrastructure')) roles.push('devops');
    if (cleanText.includes('web3') || cleanText.includes('blockchain') || cleanText.includes('solidity')) roles.push('web3');
    if (roles.length === 0) roles.push('backend'); // fallback

    return {
      isValidDeveloperResume,
      skills,
      experienceLevel,
      roles,
      reasoning: 'Programmatic fallback analysis (no LLM key or call failed).',
    };
  }

  /**
   * Upserts the parsed resume data in the database.
   */
  async upsertResume(userId: string, fileUrl: string, parsedText: string) {
    let aiProfile: AIResumeProfile;

    if (config.ai.geminiApiKey) {
      try {
        aiProfile = await this.analyzeResumeWithGemini(parsedText);
      } catch (error) {
        console.error('Gemini resume analysis failed, falling back to programmatic:', error);
        aiProfile = this.analyzeResumeProgrammatic(parsedText);
      }
    } else {
      aiProfile = this.analyzeResumeProgrammatic(parsedText);
    }

    const storedContent = JSON.stringify({
      rawText: parsedText,
      aiProfile,
    });

    return db.resume.upsert({
      where: { userId },
      create: {
        userId,
        fileUrl,
        parsedText: storedContent,
      },
      update: {
        fileUrl,
        parsedText: storedContent,
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
