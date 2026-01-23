/**
 * Environment Variable Configuration Guide
 * 
 * This file documents all environment variables used in JobTrackr.
 * Copy .env.example to .env.local and fill in the values.
 */

// ============================================================================
// DATABASE
// ============================================================================

/**
 * DATABASE_URL
 * PostgreSQL connection string
 * 
 * Format: postgresql://[user]:[password]@[host]:[port]/[database]
 * Example: postgresql://postgres:postgres@localhost:5432/jobtrackr
 * 
 * Local development:
 * - Install PostgreSQL locally or use Docker
 * - Create a database named 'jobtrackr'
 * 
 * Production:
 * - Use a managed PostgreSQL service (e.g., Vercel Postgres, Railway, Supabase)
 * - Connection string will be provided by your hosting provider
 */

// ============================================================================
// AUTHENTICATION (NextAuth.js)
// ============================================================================

/**
 * NEXTAUTH_URL
 * The canonical URL of your site
 * 
 * Development: http://localhost:3000
 * Production: https://yourapp.com
 */

/**
 * NEXTAUTH_SECRET
 * Secret key for encrypting JWT tokens and securing session data
 * 
 * IMPORTANT: Must be at least 32 characters long
 * 
 * Generate a secure secret:
 * - Option 1: openssl rand -base64 32
 * - Option 2: https://generate-secret.vercel.app/32
 * 
 * NEVER commit this value to git!
 * Use different secrets for development and production
 */

// ============================================================================
// OAUTH PROVIDERS (Optional)
// ============================================================================

/**
 * GOOGLE_CLIENT_ID
 * GOOGLE_CLIENT_SECRET
 * 
 * OAuth credentials for Google Sign-In
 * 
 * Setup:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable Google+ API
 * 4. Create OAuth 2.0 credentials
 * 5. Add authorized redirect URI: http://localhost:3000/api/auth/callback/google
 * 6. For production, add: https://yourapp.com/api/auth/callback/google
 * 
 * Leave empty if not using Google OAuth
 */

// ============================================================================
// APP CONFIGURATION
// ============================================================================

/**
 * NODE_ENV
 * Application environment
 * 
 * Values: development | production | test
 * 
 * Automatically set by Next.js in most cases
 */
