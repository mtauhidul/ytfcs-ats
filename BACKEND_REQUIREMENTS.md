# YTFCS ATS Backend API Requirements

## Overview
This document outlines the backend API requirements for the YTFCS ATS system, based on the frontend implementation needs. The backend handles resume parsing, candidate scoring, email automation, and candidate management.

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Data Structures](#data-structures)
3. [Authentication](#authentication)
4. [Database Schema](#database-schema)
5. [Environment Configuration](#environment-configuration)
6. [Frontend Integration](#frontend-integration)
7. [Testing](#testing)

---

## API Endpoints

### Resume Processing

#### Parse Resume
**POST** `/api/resume/parse`

Parse a resume file and optionally score it against a job position.

**Request:**
```javascript
Content-Type: multipart/form-data

{
  file: <resume-file>,      // Required: PDF, DOC, DOCX (max 10MB)
  jobId: <job-id>,         // Optional: For automatic scoring
  jobTitle: <job-title>    // Optional: Job title for reference
}
```

**Response (without scoring):**
```json
{
  "success": true,
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "skills": ["JavaScript", "Python", "React"],
    "experience": "5 years",
    "education": "Bachelor of Science in Computer Science",
    "jobTitle": "Software Engineer",
    "resumeText": "Full resume text content...",
    "linkedIn": "https://linkedin.com/in/johndoe",
    "location": "New York, NY",
    "languages": ["English", "Spanish"],
    "originalFilename": "resume.pdf",
    "parsingTimestamp": "2025-01-09T10:30:00.000Z",
    "affindaData": {} // Raw data from parsing service
  }
}
```

**Response (with scoring):**
```json
{
  "success": true,
  "candidate": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "skills": ["JavaScript", "Python", "React"],
    "experience": "5 years",
    "education": "Bachelor of Science in Computer Science",
    "jobTitle": "Software Engineer",
    "resumeText": "Full resume text content...",
    "linkedIn": "https://linkedin.com/in/johndoe",
    "location": "New York, NY",
    "languages": ["English", "Spanish"],
    "originalFilename": "resume.pdf",
    "parsingTimestamp": "2025-01-09T10:30:00.000Z",
    "affindaData": {}
  },
  "score": {
    "finalScore": 85,
    "componentScores": {
      "skillScore": 90,
      "experienceScore": 80,
      "educationScore": 85,
      "jobTitleScore": 75,
      "certScore": 60
    },
    "matchedSkills": ["JavaScript", "Python"],
    "missingSkills": ["AWS", "Docker"],
    "feedback": "Strong technical skills match, good experience level. Consider improving cloud technologies skills.",
    "metadata": {
      "jobId": "job123",
      "jobTitle": "Senior Developer",
      "scoredAt": "2025-01-09T10:30:00.000Z"
    }
  },
  "resumeScoringDetails": {
    "finalScore": 85,
    "jobId": "job123",
    "jobTitle": "Senior Developer",
    "componentScores": {
      "skillScore": 90,
      "experienceScore": 80,
      "educationScore": 85,
      "jobTitleScore": 75,
      "certScore": 60
    },
    "scoredAt": "2025-01-09T10:30:00.000Z"
  }
}
```

#### Score Resume
**POST** `/api/resume/score`

Score an already parsed resume against a job position.

**Request Headers:**
```javascript
{
  "Content-Type": "application/json",
  "x-api-key": "<api-key>"  // Optional: If API key authentication is enabled
}
```

**Request:**
```json
{
  "resumeData": {
    "name": "John Doe",
    "skills": ["JavaScript", "Python", "React"],
    "experience": "5 years",
    "education": "Bachelor of Science in Computer Science",
    "jobTitle": "Software Engineer"
  },
  "jobData": {
    "id": "job123",
    "title": "Senior Developer"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "finalScore": 85,
    "componentScores": {
      "skillScore": 90,
      "experienceScore": 80,
      "educationScore": 85,
      "jobTitleScore": 75,
      "certScore": 60
    },
    "matchedSkills": ["JavaScript", "Python"],
    "missingSkills": ["AWS", "Docker"],
    "feedback": "Strong technical skills match, good experience level. Consider improving cloud technologies skills.",
    "metadata": {
      "jobId": "job123",
      "jobTitle": "Senior Developer",
      "scoredAt": "2025-01-09T10:30:00.000Z"
    }
  }
}
```

### Candidate Management

#### Get Candidates
**GET** `/api/candidates`

Retrieve candidates with filtering and pagination.

#### Get Candidate
**GET** `/api/candidates/:id`

Get a specific candidate by ID.

#### Create Candidate
**POST** `/api/candidates`

Create a new candidate.

#### Update Candidate
**PUT** `/api/candidates/:id`

Update an existing candidate.

#### Delete Candidate
**DELETE** `/api/candidates/:id`

Delete a candidate.

### Email Operations

#### Send Email
**POST** `/api/email/communications/send`

Send emails to candidates or team members.

#### Import Emails
**POST** `/api/email/import`

Import emails from IMAP servers.

#### Email Automation Control
**POST** `/api/email/automation/start`
**POST** `/api/email/automation/stop`
**GET** `/api/email/automation/status`

Control and monitor email automation services.

### Health Check

#### Health Check
**GET** `/health`

Check server health and status.

**Response:**
```json
{
  "status": "ok",
  "automation": {
    "isRunning": true,
    "activeProcesses": 2
  },
  "timestamp": "2025-01-09T10:30:00.000Z"
}
```

---

## Data Structures

### Candidate Data Structure
```javascript
interface Candidate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  skills: string[];
  experience: string;
  education: string;
  jobTitle?: string;
  resumeText?: string;
  linkedIn?: string;
  location?: string;
  languages?: string[];
  originalFilename?: string;
  fileType?: string;
  fileSize?: number;
  resumeFileURL?: string;
  resumeScore?: number;
  resumeScoringDetails?: ResumeScoreData;
  source: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  history?: HistoryEntry[];
}
```

### Resume Score Data Structure
```javascript
interface ResumeScoreData {
  finalScore: number;
  componentScores: {
    skillScore: number;
    experienceScore: number;
    educationScore: number;
    jobTitleScore: number;
    certScore: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  feedback: string;
  metadata: {
    jobId: string;
    jobTitle: string;
    scoredAt: string;
  };
}
```

### Job Data Structure
```javascript
interface Job {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experience: string;
  education: string;
  certifications: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Authentication

### API Key Authentication (Optional)
If API key authentication is enabled, include the API key in request headers:

```javascript
{
  "x-api-key": "<your-api-key>"
}
```

### Rate Limiting
- `/api/resume/parse`: 50 requests per 15 minutes
- `/api/resume/score`: 100 requests per 15 minutes
- `/api/candidates`: 200 requests per 15 minutes
- `/api/email/*`: 100 requests per 15 minutes
- Global limit: 100 requests per 15 minutes per IP

---

## Database Schema

### Firestore Collections

#### Candidates Collection
```javascript
{
  id: "candidate_id",
  name: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  skills: ["JavaScript", "Python", "React"],
  experience: "5 years",
  education: "Bachelor of Science in Computer Science",
  jobTitle: "Software Engineer",
  resumeText: "Full resume text...",
  resumeScore: 85,
  resumeScoringDetails: {
    finalScore: 85,
    componentScores: {
      skillScore: 90,
      experienceScore: 80,
      educationScore: 85,
      jobTitleScore: 75,
      certScore: 60
    },
    matchedSkills: ["JavaScript", "Python"],
    missingSkills: ["AWS", "Docker"],
    feedback: "Strong technical skills match...",
    metadata: {
      jobId: "job123",
      jobTitle: "Senior Developer",
      scoredAt: "2025-01-09T10:30:00.000Z"
    }
  },
  scoredJobId: "job123",
  scoredAgainstJobTitle: "Senior Developer",
  status: "active",
  source: "manual_upload",
  createdAt: "2025-01-09T10:30:00.000Z",
  updatedAt: "2025-01-09T10:30:00.000Z",
  history: [
    {
      date: "2025-01-09T10:30:00.000Z",
      note: "Candidate imported from manual upload"
    }
  ]
}
```

#### Jobs Collection
```javascript
{
  id: "job_id",
  title: "Senior Developer",
  description: "We are looking for a Senior Developer...",
  requiredSkills: ["JavaScript", "Python", "AWS"],
  preferredSkills: ["React", "Docker", "Kubernetes"],
  experience: "3+ years",
  education: "Bachelor's degree in Computer Science",
  certifications: ["AWS Certified Developer"],
  status: "active",
  department: "Engineering",
  location: "New York, NY",
  salary: "$120,000 - $150,000",
  createdAt: "2025-01-09T10:30:00.000Z",
  updatedAt: "2025-01-09T10:30:00.000Z"
}
```

---

## Environment Configuration

### Required Environment Variables

```bash
# Application Configuration
NODE_ENV=development|production
PORT=3001
APP_URL=http://localhost:3001

# Firebase Configuration
FIREBASE_CREDENTIALS_BASE64=<base64-encoded-credentials>
FIREBASE_PROJECT_ID=<your-project-id>
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY=<service-account-private-key>
FIREBASE_STORAGE_BUCKET=<storage-bucket-name>

# OpenAI Configuration
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-3.5-turbo

# Email Configuration
DEFAULT_FROM_EMAIL=<default-sender-email>
DEFAULT_FROM_NAME=<default-sender-name>
SENDGRID_API_KEY=<sendgrid-api-key>
RESEND_API_KEY=<resend-api-key>

# API Configuration
API_KEY=<optional-api-key>
```

---

## Frontend Integration

### Data Flow

1. **Import Page Resume Parsing:**
   - User uploads resume file
   - Optionally selects job for scoring
   - Frontend sends file + jobId to `/api/resume/parse`
   - Backend parses resume and scores if jobId provided
   - Frontend displays parsed data and score results
   - User can edit data before saving to database

2. **Candidate Modal Resume Scoring:**
   - User selects existing candidate and job
   - Frontend sends candidate data + job info to `/api/resume/score`
   - Backend calculates score based on job requirements
   - Frontend displays updated score in candidate profile

3. **Data Storage:**
   - Candidate data saved to Firestore with scoring details
   - Score history maintained for audit trail
   - Resume files stored in Firebase Storage

### Frontend Components Alignment

The frontend components expect specific data structures:

- **ResumeScore Component:** Expects `ResumeScoreData` interface
- **ScoreDetail Component:** Handles both legacy and new scoring formats
- **Import Form:** Processes parsed candidate data and scoring results
- **Candidate Modal:** Displays scoring results and allows re-scoring

---

## Testing

### Backend Testing Requirements

1. **API Endpoint Testing:**
   - Test resume parsing with various file formats
   - Test scoring algorithm accuracy
   - Test error handling for invalid inputs
   - Test rate limiting functionality

2. **Integration Testing:**
   - Test Firebase integration
   - Test OpenAI API integration
   - Test email service integration

3. **Performance Testing:**
   - Test file upload limits
   - Test concurrent request handling
   - Test memory usage with large files

### Test Data Requirements

- Sample resume files (PDF, DOC, DOCX)
- Test job definitions with requirements
- Mock candidate data for scoring tests
- Email templates for automation testing

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Technical error details (development only)",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-09T10:30:00.000Z"
}
```

### Common Error Codes

- `400` - Bad Request (invalid file format, missing required fields)
- `401` - Unauthorized (invalid API key)
- `413` - Payload Too Large (file size exceeds limit)
- `422` - Unprocessable Entity (parsing failed)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (server-side processing error)

---

## Security Requirements

1. **File Upload Security:**
   - Validate file types (PDF, DOC, DOCX only)
   - Implement file size limits (10MB max)
   - Scan uploaded files for malware

2. **API Security:**
   - Implement rate limiting
   - Add CORS configuration
   - Use security headers (Helmet.js)
   - Validate all input data

3. **Data Security:**
   - Encrypt sensitive data in transit
   - Secure Firebase access
   - Implement proper error handling (no sensitive data in responses)

---

## Performance Requirements

1. **Response Times:**
   - Resume parsing: < 30 seconds
   - Resume scoring: < 5 seconds
   - Database queries: < 2 seconds

2. **Scalability:**
   - Handle 100+ concurrent users
   - Process large resume files efficiently
   - Implement caching for frequently accessed data

3. **Reliability:**
   - 99.9% uptime requirement
   - Graceful error handling
   - Automatic retry mechanisms for external APIs

---

## Deployment Requirements

1. **Environment Setup:**
   - Node.js ≥14.0.0
   - Express.js framework
   - PM2 for process management

2. **External Dependencies:**
   - Firebase/Firestore access
   - OpenAI API access
   - Email service providers (SendGrid, Resend)

3. **Monitoring:**
   - Health check endpoint
   - Application logging
   - Performance monitoring
   - Error tracking

---

**Last Updated:** January 9, 2025
**Version:** 2.0.0
**Frontend Compatibility:** All current frontend components supported
