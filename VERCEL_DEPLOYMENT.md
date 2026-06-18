# BookFlix — Vercel + Neon Deployment Guide

## Architecture

```
Browser → Vercel Edge (CDN) → Next.js Serverless Functions → Neon (PostgreSQL)
                                                    ↕
                                              AI Providers (Groq, OpenRouter, Cloudflare, OpenAI)
                                                    ↕
                                         External APIs (Open Library, Google Books)
```

---

## 1. Prerequisites

- [Vercel account](https://vercel.com)
- [Neon account](https://neon.tech) (serverless PostgreSQL)
- All AI provider API keys

---

## 2. Neon Setup

1. Create a new project in [Neon Console](https://console.neon.tech)
2. Select region closest to your Vercel deployment (e.g., `US East` for `iad1`)
3. Copy the **connection string** (it looks like):
   ```
   postgresql://user:password@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?pgbouncer=true&connection_limit=5
   ```
   The `-pooler` hostname and `?pgbouncer=true` are **essential** for serverless compatibility.

---

## 3. Vercel Environment Variables

Add these in Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | **Yes** | Neon pooled connection string (with `?pgbouncer=true`) |
| `GROQ_API_KEY` | Yes | Primary AI provider |
| `OPENROUTER_API_KEY` | Yes | Fallback AI provider |
| `CLOUDFLARE_API_KEY` | Yes | Backup AI provider |
| `CLOUDFLARE_ACCOUNT_ID` | Yes | Required alongside Cloudflare key |
| `OPENAI_API_KEY` | Yes | Last-resort AI provider |
| `API_SECRET_KEY` | **Yes** | Protects seed/admin endpoints. Generate: `openssl rand -base64 32` |
| `GOOGLE_BOOKS_API_KEY` | No | Improves book search rate limits |
| `WHITELIST_IPS` | No | Comma-separated IPs for admin access |

Do **NOT** include `NODE_ENV` — Vercel sets this automatically.

---

## 4. Deploy Steps

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Link project
vercel link

# 4. Set environment variables (or use Vercel Dashboard)
vercel env add DATABASE_URL
vercel env add GROQ_API_KEY
# ... add all required vars

# 5. Deploy
vercel --prod
```

After first deploy, run database migration via Vercel CLI:
```bash
# Run migrations (Neon connection must be live)
npx prisma migrate deploy
```

Then seed the database:
```bash
curl -X POST https://your-app.vercel.app/api/books/seed \
  -H "x-api-key: YOUR_API_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source": "all"}'
```

---

## 5. Database Migrations

This project uses Prisma Migrate. To apply migrations to Neon:

```bash
# Generate a new migration after schema changes
npx prisma migrate dev --name describe_change

# Apply to production (Neon)
npx prisma migrate deploy

# Verify
npx prisma db push --preview-feature
```

The initial migration is at `prisma/migrations/0001_init.sql`.

---

## 6. Seeding

Two seed methods:

### A. Prisma Seed (moods + seed data)
```bash
npx prisma db seed
```
Inserts 23 moods + ~330 seed books with mood classifications.

### B. API Seed (external books)
```bash
curl -X POST https://your-app.vercel.app/api/books/seed \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source": "all"}'
```
Fetches real books from Open Library + Google Books, normalizes, stores in DB. Max duration: 120s.

---

## 7. Performance Optimization

### Database Indexes (already in schema)
- `books.title`, `books.category`, `books.source`, `books.author_id`, `books.created_at`
- `book_mood.mood_id`, `book_mood.score`
- `user_books.user_id`, `user_books.book_id`
- `api_cache.cache_key`, `api_cache.expires_at`
- Unique indexes on `slug`, `email`, `name`

### Connection Pooling
- Neon's `-pooler` hostname + `?pgbouncer=true` enables transaction pooling
- `connection_limit=5` prevents connection exhaustion per serverless function

### Caching Strategy
- External API searches are cached in `api_cache` table with 30min TTL
- Book details cached for 1 hour
- Expired cache entries cleaned automatically on read

### Vercel Config (recommended)
Create `vercel.json` in root:
```json
{
  "functions": {
    "app/api/books/seed/route.ts": { "maxDuration": 120 },
    "app/api/generate/route.ts": { "maxDuration": 60 },
    "app/api/books/search/route.ts": { "maxDuration": 30 }
  },
  "crons": [
    { "path": "/api/books/seed", "schedule": "0 0 * * 0" }
  ]
}
```

---

## 8. Cost Estimates (estimated monthly)

| Service | Free Tier | Paid Tier (1M books) |
|---|---|---|
| Vercel Pro | $20/mo, 1TB bandwidth, 1000h serverless | $20 + overage |
| Neon Scale | 0.5GB DB, 10 concurrent connections | ~$19/mo (1GB, 50 connections) |
| Groq API | 30 req/min free | ~$0.15/M tokens |
| OpenRouter | Free tier available | ~$0.20/M tokens |
| Cloudflare AI | 10k req/day free | ~$0.50/1M tokens |
| OpenAI API | No free tier | ~$0.15/M tokens |

**Total est. starting cost: ~$20-40/mo** (Vercel Pro + Neon Scale).

---

## 9. Monitoring & Observability

- **Vercel Analytics**: Built-in for function timing, errors
- **Neon Metrics**: CPU, RAM, connections in Neon dashboard
- **API Health**: Check `/api/admin/health` (requires API key) for AI provider status
- **Recommended**: Add Sentry (`SENTRY_DSN` env var) for error tracking

---

## 10. Scaling Strategy (1M+ Books)

| Challenge | Solution |
|---|---|
| 1M books in DB | Neon auto-scales to 10GB+. Add composite indexes on `(category, mood_id)` |
| Slow mood queries | Materialized view for mood counts, or Redis for cached aggregations |
| High API concurrency | Increase `connection_limit` in DATABASE_URL, use Neon's connection pooler |
| AI rate limits | ApiManager already handles fallback chain + cooldown + retry |
| Search latency | Full-text search via Prisma (PostgreSQL `tsvector`), or Meilisearch/Typesense |
| Cache misses | Decrease TTL for high-traffic searches, increase for static data |
| Stale data | Weekly re-seed via Vercel Cron Jobs |

---

## 11. Security Checklist

- [ ] `API_SECRET_KEY` set and strong (`openssl rand -base64 32`)
- [ ] `DATABASE_URL` uses pooled connection with `?pgbouncer=true`
- [ ] `.env*.local` in `.gitignore` (already done)
- [ ] No `NODE_ENV` override in env vars
- [ ] API keys rotate quarterly
- [ ] Neon firewall restricts IPs to Vercel's ranges
- [ ] Vercel deployment protection enabled
