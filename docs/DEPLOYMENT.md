# Phronesis Platform - Deployment Guide

Complete step-by-step guide to deploy the Phronesis FCIP platform on the $0/month free-tier stack.

## Prerequisites

- Node.js 20+
- Python 3.11+
- Git
- A domain (optional, Vercel provides free subdomain)

---

## 1. Supabase Setup (Database + Auth)

### Create Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Choose organization and name: `phronesis-fcip`
4. Generate a secure database password (save this!)
5. Select region: `London (eu-west-2)` for UK data residency
6. Click "Create new project"

### Run Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Click "New query"
3. Copy contents of `supabase/schema.sql`
4. Click "Run" to execute

### Enable pgvector (for semantic search)

1. Go to **Database** → **Extensions**
2. Search for "vector"
3. Enable the extension

### Get API Keys

1. Go to **Settings** → **API**
2. Copy these values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`

### Configure Auth

1. Go to **Authentication** → **Providers**
2. Enable Email provider
3. Configure password requirements
4. (Optional) Enable Google OAuth for easier login

---

## 2. Cloudflare R2 Setup (Document Storage)

### Create Account

1. Go to [cloudflare.com](https://cloudflare.com) and sign up
2. Navigate to **R2** in sidebar
3. Click "Create bucket"
4. Name: `apatheia-documents`
5. Location: `Europe (London)`

### Create API Token

1. Go to **R2** → **Manage R2 API Tokens**
2. Click "Create API token"
3. Name: `phronesis-api`
4. Permissions: "Object Read & Write"
5. Specify bucket: `apatheia-documents`
6. Click "Create API Token"
7. Copy these values:
   - Access Key ID → `R2_ACCESS_KEY_ID`
   - Secret Access Key → `R2_SECRET_ACCESS_KEY`

### Get Account ID

1. Go to **R2** → **Overview**
2. Copy Account ID → `R2_ACCOUNT_ID`
3. Set `R2_BUCKET_NAME` = `apatheia-documents`

---

## 3. Groq Setup (Fast LLM Inference)

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up with GitHub or Google
3. Go to **API Keys**
4. Click "Create API Key"
5. Name: `phronesis`
6. Copy the key → `GROQ_API_KEY`

**Note:** Groq free tier includes unlimited requests at 30/minute rate limit.

---

## 4. Google AI Studio Setup (Gemini for Long Docs)

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with Google account
3. Click "Get API key" in sidebar
4. Click "Create API key"
5. Select a Google Cloud project (or create new)
6. Copy the key → `GOOGLE_AI_API_KEY`

**Note:** Free tier includes generous limits for Gemini 1.5 Flash.

---

## 5. Modal Setup (Serverless Python Processing)

### Install CLI

```bash
pip install modal
```

### Create Account & Authenticate

```bash
modal token new
```

This opens browser to authenticate. Follow prompts.

### Deploy Functions

```bash
cd apatheia-scaffold
modal deploy modal/
```

### Get Webhook URL

After deployment, Modal outputs the function URL:
```
https://your-workspace--process-document.modal.run
```

Set this as `MODAL_PROCESS_URL` in your environment.

### Get API Tokens (for CI/CD)

1. Go to [modal.com/settings](https://modal.com/settings)
2. Find "Token ID" → `MODAL_TOKEN_ID`
3. Find "Token Secret" → `MODAL_TOKEN_SECRET`

---

## 6. Vercel Deployment

### Install CLI

```bash
npm i -g vercel
```

### Link Project

```bash
cd apatheia-scaffold
vercel link
```

### Set Environment Variables

In Vercel dashboard or via CLI:

```bash
# Supabase
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Cloudflare R2
vercel env add R2_ACCOUNT_ID
vercel env add R2_ACCESS_KEY_ID
vercel env add R2_SECRET_ACCESS_KEY
vercel env add R2_BUCKET_NAME

# AI APIs
vercel env add GROQ_API_KEY
vercel env add GOOGLE_AI_API_KEY

# Modal
vercel env add MODAL_TOKEN_ID
vercel env add MODAL_TOKEN_SECRET
vercel env add MODAL_PROCESS_URL

# Cron secret (generate random string)
vercel env add CRON_SECRET
```

### Deploy

```bash
vercel --prod
```

---

## 7. Configure Cron Jobs

Vercel automatically picks up cron configuration from `vercel.json`.

The document processing queue runs every 5 minutes:
```json
{
  "crons": [
    {
      "path": "/api/cron/process-queue",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Note:** Cron jobs require Vercel Pro ($20/mo) for production. For free tier, use:
- [cron-job.org](https://cron-job.org) - Free external cron service
- Configure it to hit your `/api/cron/process-queue` endpoint with the `CRON_SECRET` header

---

## 8. Local Development

### Setup

```bash
# Clone/extract project
cd apatheia-scaffold

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Fill in all values from steps above
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 9. GitHub Actions (CI/CD)

### Add Repository Secrets

Go to GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:
- `VERCEL_TOKEN` - From Vercel account settings
- `VERCEL_ORG_ID` - From `.vercel/project.json`
- `VERCEL_PROJECT_ID` - From `.vercel/project.json`
- `MODAL_TOKEN_ID`
- `MODAL_TOKEN_SECRET`
- `SUPABASE_ACCESS_TOKEN` - From Supabase account settings
- `SUPABASE_PROJECT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Trigger Deployment

Push to `main` branch triggers:
1. Lint + type check
2. Tests
3. Build
4. Deploy to Vercel (production)
5. Deploy Modal functions
6. Run database migrations

---

## Verification Checklist

- [ ] Supabase project created and schema deployed
- [ ] pgvector extension enabled
- [ ] R2 bucket created and tokens configured
- [ ] Groq API key obtained
- [ ] Google AI API key obtained
- [ ] Modal functions deployed
- [ ] Vercel project deployed
- [ ] All environment variables set
- [ ] Cron job configured
- [ ] Auth working (can sign up/login)
- [ ] Document upload working
- [ ] Processing queue running
- [ ] Analysis engines returning results

---

## Troubleshooting

### "Unauthorized" on API calls
- Check Supabase anon key is correct
- Verify user is logged in
- Check RLS policies in Supabase

### Documents stuck in "pending"
- Check Modal deployment succeeded
- Verify `MODAL_PROCESS_URL` is set
- Check cron job is running (Vercel logs)

### Slow analysis responses
- Groq has 30 req/min limit - may queue
- Large documents go to Gemini (slower but handles 1M tokens)

### R2 upload failures
- Check bucket permissions
- Verify all R2 environment variables set
- Check file size under 100MB

---

## Cost Monitoring

All services have free tiers, but monitor usage:

| Service | Free Limit | Monitor At |
|---------|------------|------------|
| Vercel | 100GB bandwidth | vercel.com/dashboard |
| Supabase | 500MB DB, 1GB storage | supabase.com/dashboard |
| Cloudflare R2 | 10GB storage | dash.cloudflare.com |
| Modal | 30 hours/month | modal.com/usage |
| Groq | 30 req/min | console.groq.com |
| Google AI | Generous limits | aistudio.google.com |

---

## Next Steps

1. **Add custom domain** - Vercel settings → Domains
2. **Enable analytics** - Add PostHog or Vercel Analytics
3. **Set up monitoring** - Sentry for error tracking
4. **Configure backups** - Supabase automatic backups (Pro tier)
5. **Add rate limiting** - Protect API endpoints

---

## Support

- Supabase: [supabase.com/docs](https://supabase.com/docs)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
- Modal: [modal.com/docs](https://modal.com/docs)
- Groq: [console.groq.com/docs](https://console.groq.com/docs)

---

*Apatheia Labs - Phronesis Platform v6.0*
*Clarity Through Analysis*
