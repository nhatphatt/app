# Minitake API - Cloudflare Workers

Backend API chạy trên Cloudflare Workers + D1 (SQLite).

## Setup

```bash
cd backend-cf
npm install
```

## Local Development

```bash
# Tạo D1 database local
npx wrangler d1 execute minitake --local --file=./schema.sql

# Chạy dev server
npm run dev
```

## Deploy Production

### 1. Tạo schema trên D1
```bash
npx wrangler d1 execute minitake --remote --file=./schema.sql
```

### 2. Cấu hình secrets
```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put PAYOS_CLIENT_ID
npx wrangler secret put PAYOS_API_KEY
npx wrangler secret put PAYOS_CHECKSUM_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
npx wrangler secret put WEBHOOK_SECRET
npx wrangler secret put PRO_PLAN_PRICE
npx wrangler secret put STARTER_MAX_TABLES
npx wrangler secret put TRIAL_DAYS
```

### 3. Deploy
```bash
npm run deploy
```

API sẽ có tại: `https://minitake-api.<your-subdomain>.workers.dev`

## Cập nhật Frontend
Sau khi deploy, cập nhật `REACT_APP_BACKEND_URL` trong frontend/.env.production với URL của Worker.
