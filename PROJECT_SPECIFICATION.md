# JobRadar

## AI-Powered Job Discovery & Career Intelligence Platform

Version: 1.0

Author: Niladri Mohanta

---

# 1. Executive Summary

JobRadar is an AI-powered job discovery platform designed to automate the job hunting process.

Instead of manually visiting hundreds of company career pages every day, JobRadar continuously discovers companies, crawls career pages, extracts job postings, evaluates relevance using AI, and notifies users when highly relevant opportunities appear.

The platform combines:

* Distributed web crawling
* AI-powered job matching
* Resume analysis
* Semantic search
* Notification pipelines
* Automated company discovery

The objective is to reduce the time spent searching for jobs while increasing the likelihood of finding highly relevant opportunities quickly.

---

# 2. Problem Statement

Modern job seekers face several problems:

## Problem 1

Jobs are spread across:

* Company career pages
* Startup websites
* LinkedIn
* Wellfound
* YC Jobs
* Product Hunt startups

There is no single source of truth.

---

## Problem 2

Most users repeatedly visit the same websites every day.

This process is:

* Time consuming
* Repetitive
* Inefficient

---

## Problem 3

Most job alerts are keyword-based.

For example:

Searching for:

Backend Engineer

may miss:

* Platform Engineer
* Infrastructure Engineer
* Developer Experience Engineer

despite being relevant.

---

## Problem 4

Users struggle to prioritize opportunities.

Not every job deserves an application.

A system should identify:

* Best matches
* Medium matches
* Poor matches

automatically.

---

# 3. Goals

## Primary Goals

* Discover jobs automatically
* Match jobs to user preferences
* Eliminate manual searching
* Deliver daily opportunities

---

## Secondary Goals

* Build a growing company database
* Support AI-based resume matching
* Generate application recommendations

---

# 4. User Personas

## Persona 1

Recent Graduate

Needs:

* Entry level jobs
* Internships
* Remote opportunities

---

## Persona 2

Experienced Developer

Needs:

* Specific tech stack roles
* Salary filters
* Seniority filters

---

## Persona 3

Web3 Developer

Needs:

* Blockchain jobs
* Smart contract jobs
* Crypto startups

---

# 5. Functional Requirements

## User Management

Users can:

* Register
* Login
* Update profile
* Upload resume

---

## Resume Management

Users can:

* Upload resume
* Replace resume
* Parse resume
* Generate embeddings

---

## Company Management

Admin can:

* Add company
* Add career page
* Remove company
* Enable crawling

---

## Job Crawling

System must:

* Crawl websites
* Extract jobs
* Detect new jobs
* Detect removed jobs

---

## AI Matching

System must:

* Analyze job descriptions
* Analyze user resume
* Generate match score
* Generate match reason

---

## Notifications

System must:

* Send email alerts
* Send Telegram alerts
* Send Discord alerts
* Generate daily reports

---

# 6. Non Functional Requirements

## Performance

Support:

100,000+ jobs

---

## Scalability

Support:

10,000+ companies

---

## Availability

Target:

99.9%

---

## Reliability

Queue retries

Dead letter queues

Failure recovery

---

# 7. High Level Architecture

```
                ┌─────────────┐
                │   Frontend  │
                └──────┬──────┘
                       │
                ┌──────▼──────┐
                │ API Server  │
                └──────┬──────┘
                       │
     ┌─────────────────┼────────────────┐
     │                 │                │
```

┌───────▼───────┐ ┌──────▼──────┐ ┌────────▼──────┐
│ Crawl Queue   │ │ Match Queue │ │ Notify Queue  │
└───────┬───────┘ └──────┬──────┘ └────────┬──────┘
│                │                │
┌───────▼───────┐ ┌──────▼──────┐ ┌───────▼────────┐
│ Crawl Worker  │ │ AI Worker   │ │ Notify Worker │
└───────┬───────┘ └──────┬──────┘ └───────┬────────┘
│                │                │
└────────┬───────┴────────┬───────┘
│                │
┌───────▼────────────────▼───────┐
│         PostgreSQL             │
└────────────────────────────────┘

---

# 8. Core Services

## API Service

Responsibilities:

* Authentication
* Profile Management
* Resume Upload
* Job Search
* Alerts

Tech:

Fastify

---

## Crawl Service

Responsibilities:

* Visit websites
* Extract jobs
* Parse content

Tech:

Playwright

---

## AI Service

Responsibilities:

* Job scoring
* Resume matching
* Semantic search

Tech:

OpenAI / Gemini

---

## Notification Service

Responsibilities:

* Email
* Telegram
* Discord

---

# 9. Company Discovery System

One of the most important features.

Instead of manually adding companies:

System discovers them.

---

## Sources

* YC Startups
* Product Hunt
* Wellfound
* LinkedIn
* Startup Directories

---

## Workflow

Step 1

Collect company website

Step 2

Visit website

Step 3

Search for:

* careers
* jobs
* hiring
* join-us
* work-with-us

Step 4

Store discovered pages

---

# 10. Job Crawling Flow

Scheduler triggers crawl.

↓

Create crawl jobs.

↓

Worker receives crawl job.

↓

Visit career page.

↓

Extract jobs.

↓

Normalize data.

↓

Store jobs.

↓

Compare previous snapshot.

↓

Detect new jobs.

↓

Trigger matching pipeline.

---

# 11. Job Matching Flow

Job created.

↓

Match queue triggered.

↓

Load user profile.

↓

Load resume embedding.

↓

Load job embedding.

↓

Similarity calculation.

↓

Generate score.

↓

Store result.

↓

Notify user.

---

# 12. Notification Flow

Match score > threshold

↓

Create alert

↓

Send notification

↓

Track delivery

↓

Update status

---

# 13. Database Schema

## User

Purpose:

System user.

Fields:

id

email

name

passwordHash

createdAt

updatedAt

---

## Resume

Purpose:

Store uploaded resumes.

Fields:

id

userId

fileUrl

parsedText

embeddingVector

createdAt

---

## Company

Purpose:

Tracked companies.

Fields:

id

name

website

industry

source

isActive

createdAt

---

## CareerPage

Purpose:

Company career pages.

Fields:

id

companyId

url

crawlFrequency

lastCrawledAt

status

---

## Job

Purpose:

Current job listing.

Fields:

id

companyId

careerPageId

externalJobId

title

location

employmentType

experienceLevel

salaryMin

salaryMax

description

requirements

applyUrl

postedAt

isActive

---

## JobSnapshot

Purpose:

Historical tracking.

Fields:

id

jobId

snapshotData

createdAt

---

## JobEmbedding

Purpose:

Semantic search.

Fields:

id

jobId

vector

createdAt

---

## UserPreference

Purpose:

Job filters.

Fields:

id

userId

locations

keywords

technologies

experienceLevels

employmentTypes

---

## JobMatch

Purpose:

Store match results.

Fields:

id

userId

jobId

score

reason

matchedAt

---

## Alert

Purpose:

Notification records.

Fields:

id

userId

jobId

channel

status

sentAt

---

## Application

Purpose:

Track applications.

Fields:

id

userId

jobId

status

notes

appliedAt

---

## CrawlRun

Purpose:

Track crawl executions.

Fields:

id

careerPageId

status

startedAt

completedAt

jobsFound

errorMessage

---

## WorkerLog

Purpose:

Observability.

Fields:

id

workerType

jobId

message

level

createdAt

---

# 14. Queue Architecture

Queue 1

Company Discovery Queue

Purpose:

Discover new companies

---

Queue 2

Career Crawl Queue

Purpose:

Crawl career pages

---

Queue 3

Job Processing Queue

Purpose:

Normalize jobs

---

Queue 4

Embedding Queue

Purpose:

Generate embeddings

---

Queue 5

Match Queue

Purpose:

Find matching users

---

Queue 6

Notification Queue

Purpose:

Send alerts

---

# 15. AI Layer

## Job Understanding

Extract:

* Role
* Skills
* Seniority
* Experience

---

## Resume Understanding

Extract:

* Skills
* Projects
* Experience

---

## Similarity Matching

Calculate:

Resume ↔ Job Match

---

## Gap Analysis

Generate:

Strengths

Weaknesses

Missing Skills

---

# 16. API Design

POST /auth/register

POST /auth/login

GET /jobs

GET /jobs/:id

GET /matches

GET /alerts

POST /resume/upload

GET /companies

POST /companies

POST /crawl/run

---

# 17. Analytics

Metrics:

Jobs Crawled

Companies Tracked

Successful Crawls

Failed Crawls

Matches Generated

Notifications Sent

Applications Submitted

---

# 18. Future Enhancements

## V2

Multi-user platform

---

## V3

Semantic search

---

## V4

Resume optimization

---

## V5

Application prioritization

---

## V6

AI-generated cover letters

---

## V7

AI job hunting agent

Agent decides:

* Which sites to visit
* Which jobs to evaluate
* Which jobs to recommend

without user intervention.

---

# 19. Resume Description

JobRadar | Distributed Job Discovery & Career Intelligence Platform

Built an AI-powered job intelligence platform that automatically discovers company career pages, crawls job listings, performs semantic resume-to-job matching, and delivers personalized opportunity alerts through an event-driven architecture. Designed distributed crawling workers, AI matching pipelines, background processing queues, notification services, and historical job tracking using Fastify, PostgreSQL, Redis, BullMQ, Playwright, and LLM-powered ranking systems.
