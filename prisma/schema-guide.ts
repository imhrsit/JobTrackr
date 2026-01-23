/**
 * Prisma Schema Overview - JobTrackr
 * 
 * This document explains the database schema and relationships
 */

// ============================================================================
// CORE MODELS
// ============================================================================

/**
 * User
 * - Stores user authentication and profile information
 * - Can have multiple OAuth accounts (Account model)
 * - Has many jobs and applications
 * - Tracks skills through UserSkill junction table
 */

/**
 * Account
 * - OAuth provider accounts (Google, GitHub, etc.)
 * - Required for NextAuth.js OAuth support
 * - Many-to-one with User
 */

/**
 * Job
 * - Represents a job posting/opportunity
 * - Contains job details, requirements, salary info
 * - Has one Application per job (one-to-one)
 * - Can have multiple required/desired skills via JobSkill
 */

/**
 * Application
 * - Tracks the status of a job application
 * - Links User to Job (many-to-one with both)
 * - Unique per job (one user, one application per job)
 * - Has many referrals, interviews, and activity logs
 * - Status workflow: SAVED → APPLIED → REFERRED → INTERVIEWING → OFFERED/REJECTED
 */

// ============================================================================
// SUPPORTING MODELS
// ============================================================================

/**
 * Referral
 * - Tracks who you asked for a referral
 * - Status: PENDING, ACCEPTED, DECLINED, NO_RESPONSE
 * - Many-to-one with Application
 */

/**
 * Interview
 * - Scheduled interviews for an application
 * - Types: PHONE_SCREEN, TECHNICAL, BEHAVIORAL, etc.
 * - Includes preparation notes and feedback
 * - Many-to-one with Application
 */

/**
 * Skill
 * - Master list of skills (e.g., "React", "Python", "Communication")
 * - Categories: Frontend, Backend, DevOps, Soft Skills, etc.
 * - Junction tables: JobSkill (required for job), UserSkill (user proficiency)
 */

/**
 * JobSkill
 * - Links Job to Skill (many-to-many)
 * - Indicates if skill is required or nice-to-have
 */

/**
 * UserSkill
 * - Links User to Skill (many-to-many)
 * - Tracks proficiency level (1-5) and years of experience
 */

/**
 * ActivityLog
 * - Audit trail of all actions
 * - Types: APPLICATION_CREATED, STATUS_CHANGED, INTERVIEW_SCHEDULED, etc.
 * - Stores metadata as JSON for flexibility
 */

// ============================================================================
// KEY RELATIONSHIPS
// ============================================================================

/**
 * User → Jobs (1:N)
 * User → Applications (1:N)
 * User → UserSkills (1:N)
 * User → Accounts (1:N)
 * 
 * Job → Application (1:1)
 * Job → JobSkills (1:N)
 * 
 * Application → Referrals (1:N)
 * Application → Interviews (1:N)
 * Application → ActivityLogs (1:N)
 * 
 * Skill → JobSkills (1:N)
 * Skill → UserSkills (1:N)
 */

// ============================================================================
// CASCADE DELETES
// ============================================================================

/**
 * When User is deleted:
 * - All Accounts deleted
 * - All Jobs deleted
 * - All Applications deleted
 * - All UserSkills deleted
 * - All ActivityLogs deleted
 * 
 * When Job is deleted:
 * - Application deleted
 * - All JobSkills deleted
 * 
 * When Application is deleted:
 * - All Referrals deleted
 * - All Interviews deleted
 * - All related ActivityLogs deleted
 */

// ============================================================================
// INDEXES
// ============================================================================

/**
 * Performance indexes on:
 * - User: email
 * - Account: userId, provider+providerAccountId
 * - Job: userId, company, createdAt
 * - Application: userId, status, createdAt, appliedDate
 * - Referral: applicationId, status
 * - Interview: applicationId, scheduledFor, completed
 * - Skill: category
 * - JobSkill: jobId, skillId
 * - UserSkill: userId, skillId
 * - ActivityLog: userId, applicationId, createdAt, type
 */
