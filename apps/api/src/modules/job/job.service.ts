import { db } from '@repo/database';

export interface GetJobsParams {
  page?: number;
  limit?: number;
  search?: string;
  remoteOnly?: boolean;
  minScore?: number;
  userId?: string;
}

const DEFAULT_SKILLS = [
  'node', 'typescript', 'javascript', 'postgres', 'backend', 'web3', 'express', 'fastify', 'git'
];

/**
 * Programmatic skill extraction from resume text
 */
export function extractSkills(text: string): string[] {
  if (!text) return [];
  const cleanText = text.toLowerCase();
  
  const skillKeywords = [
    // Languages
    'javascript', 'typescript', 'nodejs', 'node.js', 'node', 'golang', 'go', 'rust', 'python', 'solidity', 'cpp', 'c++', 'java', 'ruby', 'php',
    // Databases
    'postgres', 'postgresql', 'mongodb', 'mongo', 'redis', 'mysql', 'sql', 'dynamodb', 'prisma', 'supabase',
    // Frameworks/Tools
    'react', 'nextjs', 'next.js', 'express', 'fastify', 'nestjs', 'nest.js', 'docker', 'kubernetes', 'aws', 'gcp', 'git', 'graphql',
    // Domains / Backend concepts
    'backend', 'frontend', 'fullstack', 'full stack', 'web3', 'blockchain', 'smart contract', 'smart contracts', 'devops'
  ];

  const foundSkills: string[] = [];
  for (const skill of skillKeywords) {
    if (skill === 'go') {
      const goRegex = /\bgo\b/i;
      if (goRegex.test(cleanText)) foundSkills.push('go');
    } else if (skill === 'cpp') {
      const cppRegex = /\bcpp\b/i;
      if (cppRegex.test(cleanText)) foundSkills.push('cpp');
    } else if (skill === 'c++') {
      if (cleanText.includes('c++')) foundSkills.push('c++');
    } else if (skill === 'node.js' || skill === 'nodejs' || skill === 'node') {
      if (cleanText.includes('node')) {
        if (!foundSkills.includes('node')) foundSkills.push('node');
      }
    } else if (skill === 'postgres' || skill === 'postgresql') {
      if (cleanText.includes('postgres')) {
        if (!foundSkills.includes('postgres')) foundSkills.push('postgres');
      }
    } else if (skill === 'next.js' || skill === 'nextjs') {
      if (cleanText.includes('nextjs') || cleanText.includes('next.js')) {
        if (!foundSkills.includes('nextjs')) foundSkills.push('nextjs');
      }
    } else if (skill === 'nest.js' || skill === 'nestjs') {
      if (cleanText.includes('nestjs') || cleanText.includes('nest.js')) {
        if (!foundSkills.includes('nestjs')) foundSkills.push('nestjs');
      }
    } else if (skill === 'full stack' || skill === 'fullstack') {
      if (cleanText.includes('full stack') || cleanText.includes('fullstack')) {
        if (!foundSkills.includes('fullstack')) foundSkills.push('fullstack');
      }
    } else if (skill === 'smart contract' || skill === 'smart contracts') {
      if (cleanText.includes('smart contract')) {
        if (!foundSkills.includes('smart contract')) foundSkills.push('smart contract');
      }
    } else {
      const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
      if (regex.test(cleanText)) {
        foundSkills.push(skill);
      }
    }
  }

  return foundSkills;
}

/**
 * Score a single job against user skills
 */
function scoreJob(job: any, userSkills: string[]): number {
  if (userSkills.length === 0) {
    return 0;
  }
  const title = (job.title || '').toLowerCase();
  const desc = (job.description || '').toLowerCase();
  const location = (job.location || '').toLowerCase();

  // 1. Filter out completely unrelated roles immediately (score = 0)
  const pureNonTechKeywords = [
    'marketing', 'sales', 'seo', 'designer', 'design', 'copywriter', 'content creator', 'writer',
    'recruiter', 'recruiting', 'talent acquisition', 'people partner', 'people ops',
    'customer success', 'customer support', 'support associate', 'success associate', 'success manager',
    'support', 'success',
    'product manager', 'project manager', 'program manager', 'product owner', 'scrum master',
    'finance', 'accountant', 'accounting', 'tax', 'treasury', 'billing', 'audit',
    'legal', 'lawyer', 'counsel', 'compliance', 'attorney',
    'office manager', 'executive assistant', 'administrative', 'admin',
    'business development', 'bizdev', 'representative', 'account executive',
    'vice president', 'president', 'chief of staff', 'counsel'
  ];

  let isUnrelated = false;
  for (const keyword of pureNonTechKeywords) {
    if (title.includes(keyword)) {
      isUnrelated = true;
      break;
    }
  }

  const boundaryNonTech = ['ae', 'hr', 'pm', 'bdr', 'sdr'];
  for (const keyword of boundaryNonTech) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(title)) {
      isUnrelated = true;
      break;
    }
  }

  const businessTerms = ['director', 'manager', 'head', 'lead', 'vice president', 'president', 'chief'];
  const hasBusinessTerm = businessTerms.some(term => title.includes(term));

  const hasDeveloperKeyword = ['engineer', 'developer', 'programmer', 'architect', 'coder', 'backend', 'back-end', 'fullstack', 'full stack', 'devops', 'secops'].some(term => title.includes(term));

  if (isUnrelated && !hasDeveloperKeyword) {
    return 0;
  }

  if (hasBusinessTerm && !hasDeveloperKeyword) {
    return 0;
  }

  // 2. Base score
  let score = 30;

  // Apply heavy penalty if the role contains non-tech keywords but is a developer/engineer role (e.g. Sales Engineer)
  if (isUnrelated && hasDeveloperKeyword) {
    score -= 45;
  }

  // 3. Technical Skill Match
  let directMatchesCount = 0;
  const techKeywords = [
    'javascript', 'typescript', 'node', 'golang', 'go', 'rust', 'python', 'solidity', 'cpp', 'c++', 'java', 'ruby', 'php',
    'postgres', 'postgresql', 'mongodb', 'mongo', 'redis', 'mysql', 'sql', 'dynamodb', 'prisma', 'supabase',
    'react', 'nextjs', 'next.js', 'express', 'fastify', 'nestjs', 'nest.js', 'docker', 'kubernetes', 'aws', 'gcp', 'git', 'graphql',
    'web3', 'blockchain', 'smart contract'
  ];

  const jobTechs: string[] = [];
  for (const tech of techKeywords) {
    let matches = false;
    if (tech === 'go') {
      matches = /\bgo\b/i.test(title) || /\bgo\b/i.test(desc);
    } else if (tech === 'node' || tech === 'nodejs' || tech === 'node.js') {
      matches = title.includes('node') || desc.includes('node');
    } else if (tech === 'postgres' || tech === 'postgresql') {
      matches = title.includes('postgres') || desc.includes('postgres');
    } else if (tech === 'nextjs' || tech === 'next.js') {
      matches = title.includes('nextjs') || title.includes('next.js') || desc.includes('nextjs') || desc.includes('next.js');
    } else {
      const escapedTech = tech.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedTech}\\b`, 'i');
      matches = regex.test(title) || regex.test(desc);
    }

    if (matches) {
      jobTechs.push(tech);
    }
  }

  for (const tech of jobTechs) {
    const hasSkill = userSkills.some(skill => {
      if (skill === 'node' || skill === 'nodejs' || skill === 'node.js') {
        return tech === 'node' || tech === 'nodejs' || tech === 'node.js';
      }
      if (skill === 'postgres' || skill === 'postgresql') {
        return tech === 'postgres' || tech === 'postgresql';
      }
      if (skill === 'nextjs' || skill === 'next.js') {
        return tech === 'nextjs' || tech === 'next.js';
      }
      return skill === tech;
    });

    if (hasSkill) {
      directMatchesCount++;
    }
  }

  if (directMatchesCount > 0) {
    score += Math.min(40, directMatchesCount * 15);
  }

  // 4. Backend / Developer Alignment
  const isBackend = title.includes('backend') || title.includes('back-end');
  const isFullstack = title.includes('fullstack') || title.includes('full stack');
  
  if (isBackend) {
    score += 20;
  } else if (isFullstack) {
    score += 15;
  } else if (hasDeveloperKeyword) {
    score += 10;
  }

  // 5. Capping other backend languages (Go, Rust, Python, etc.)
  const otherLanguages = ['go', 'golang', 'rust', 'python', 'ruby', 'java', 'cpp', 'c++', 'php'];
  const requiresOtherLang = jobTechs.some(tech => otherLanguages.includes(tech));
  
  if (isBackend && directMatchesCount === 0 && requiresOtherLang) {
    score = Math.max(50, Math.min(65, score));
  }

  // 6. Seniority Capping
  const isSenior = title.includes('senior') || title.includes('sr') || title.includes('staff') || title.includes('principal') || title.includes('lead') || title.includes('director') || title.includes('manager') || title.includes('head') || title.includes('architect');
  if (isSenior) {
    score -= 25;
  } else {
    const isEntryLevel = title.includes('junior') || title.includes('jr') || title.includes('associate') || title.includes('intern') || title.includes('graduate') || title.includes('grad') || title.includes('fresher') || title.includes('entry level') || title.includes('entry-level') || desc.includes('0-2 years') || desc.includes('0-3 years') || desc.includes('no experience') || desc.includes('new grad');
    if (isEntryLevel) {
      score += 15;
    }
  }

  // 7. Location & Remote
  const isRemote = title.includes('remote') || location.includes('remote') || desc.includes('remote work') || desc.includes('work from home') || desc.includes('work-from-home') || location.includes('anywhere');
  const isIndia = location.includes('india') || location.includes('bangalore') || location.includes('bengaluru') || location.includes('pune') || location.includes('mumbai') || location.includes('delhi') || location.includes('hyderabad') || location.includes('chennai') || location.includes('noida') || location.includes('gurgaon') || location.includes('in') || location.includes('ind');

  if (isRemote) {
    score += 15;
  }
  if (isIndia) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get paginated and filtered list of crawled jobs
 */
export async function getJobs(params: GetJobsParams) {
  const page = params.page || 1;
  const limit = params.limit || 50;

  // Fetch all active jobs
  const activeJobs = await db.job.findMany({
    where: {
      isActive: true,
    },
    include: {
      company: {
        select: {
          name: true,
          website: true,
          normalizedDomain: true,
        },
      },
    },
  });

  // Extract user skills from resume if userId is provided
  let userSkills = DEFAULT_SKILLS;
  let isValidDeveloperResume = true;
  let hasResume = false;

  if (params.userId) {
    const resume = await db.resume.findUnique({
      where: { userId: params.userId },
    });
    if (resume && resume.parsedText) {
      hasResume = true;
      try {
        const parsed = JSON.parse(resume.parsedText);
        if (parsed && parsed.aiProfile) {
          isValidDeveloperResume = parsed.aiProfile.isValidDeveloperResume;
          userSkills = parsed.aiProfile.skills || [];
        } else {
          // Backward compatibility for older plain text
          userSkills = extractSkills(resume.parsedText);
          isValidDeveloperResume = userSkills.length > 0;
        }
      } catch {
        // Plain text
        userSkills = extractSkills(resume.parsedText);
        isValidDeveloperResume = userSkills.length > 0;
      }
    }
  }

  if (hasResume && !isValidDeveloperResume) {
    return {
      items: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 0,
      },
    };
  }

  // Score all jobs dynamically
  const scoredJobs = activeJobs.map(job => {
    const relevanceScore = scoreJob(job, userSkills);
    return {
      ...job,
      relevanceScore,
    };
  });

  // Filter out completely unrelated jobs (score === 0)
  let filteredJobs = scoredJobs.filter(job => job.relevanceScore > 0);

  // Apply Search filter in-memory
  if (params.search) {
    const searchLower = params.search.toLowerCase();
    filteredJobs = filteredJobs.filter(job => 
      job.title.toLowerCase().includes(searchLower) ||
      (job.description && job.description.toLowerCase().includes(searchLower)) ||
      job.company.name.toLowerCase().includes(searchLower)
    );
  }

  // Apply Remote only filter in-memory
  if (params.remoteOnly) {
    filteredJobs = filteredJobs.filter(job => {
      const title = job.title.toLowerCase();
      const location = (job.location || '').toLowerCase();
      const desc = (job.description || '').toLowerCase();
      return title.includes('remote') || location.includes('remote') || desc.includes('remote work') || desc.includes('work from home') || desc.includes('work-from-home') || location.includes('anywhere');
    });
  }

  // Apply Minimum score filter in-memory
  if (params.minScore !== undefined) {
    filteredJobs = filteredJobs.filter(job => job.relevanceScore >= params.minScore!);
  }

  // Sort by relevance score descending
  filteredJobs.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const total = filteredJobs.length;
  const items = filteredJobs.slice((page - 1) * limit, page * limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get job by ID
 */
export async function getJobById(id: string) {
  return await db.job.findUnique({
    where: { id },
    include: {
      company: {
        select: {
          name: true,
          website: true,
          normalizedDomain: true,
        },
      },
    },
  });
}
