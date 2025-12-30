# Deployment Guide

This QMS application is designed to be easily deployed to modern cloud platforms or self-hosted environments.

## Option 1: Vercel (Recommended for SaaS/Demo)

Vercel is the creators of Next.js and offers the seamless deployment experience.

1.  **Push to GitHub**: Ensure your code is in a GitHub repository.
2.  **Import to Vercel**: Go to [vercel.com/new](https://vercel.com/new) and select your repository.
3.  **Configure Environment Variables**:
    *   `DATABASE_URL`: Connection string to your PostgreSQL database (e.g., Supabase, Neon, or Railway).
    *   `NEXTAUTH_SECRET`: A random string (generate with `openssl rand -base64 32`).
    *   `NEXTAUTH_URL`: Your production URL (e.g., `https://your-app.vercel.app`).
4.  **Deploy**: Click "Deploy".

## Option 2: Railway (Full Stack)

Railway allows you to host both the Database and the App in one project.

1.  Create a project on [Railway](https://railway.app/).
2.  Add a PostgreSQL database service.
3.  Add a GitHub repo service (this app).
4.  Link the variables (Railway often does `DATABASE_URL` automatically).
5.  Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL`.

## Option 3: Docker (Self-Hosted / Enterprise)

For on-premise or strict security requirements, use Docker.

### Build Image
```bash
docker build -t open-qms .
```

### Run Container
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e NEXTAUTH_SECRET="secret" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  open-qms
```

## Post-Deployment

After deploying, remember to run migrations on your production database:

```bash
npx prisma migrate deploy
```
