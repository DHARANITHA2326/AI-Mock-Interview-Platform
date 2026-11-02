# Mock Interview Agent

An AI-powered mock interview platform for practicing technical and HR interviews. It includes resume analysis, interview question generation, voice-based responses, performance feedback, interview history, and student and teacher dashboards.

## Requirements

- Node.js 20.19 or newer
- npm
- A Google Gemini API key for AI-powered features
- MongoDB is optional; without `MONGODB_URI`, the app uses its in-memory demo store

## Run locally

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`. Set `MONGODB_URI` if you want MongoDB persistence.

3. Start the app:

   ```sh
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Build

```sh
npm run build
```

The production server serves the generated `dist` files when `NODE_ENV=production`:

```sh
npm start
```

## Deploy to Vercel

Import this repository into Vercel and use the repository root as the project
root. The Vite build outputs the frontend to `dist`, and API requests are served
by the Express-backed function in `api/[...path].ts`. Resume file uploads are
limited to 4 MB to stay within Vercel's request-size limit.

Set `GEMINI_API_KEY` in the Vercel project environment variables to enable
Gemini-powered resume analysis and interview generation. Set `MONGODB_URI` for
persistent data; without it, data is stored in the in-memory demo store and is
not durable across serverless invocations. Set a private `JWT_SECRET` for
deployed authentication.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | For AI features | Google Gemini API key |
| `MONGODB_URI` | No | MongoDB connection string; otherwise the in-memory demo store is used |
| `JWT_SECRET` | Recommended in deployment | Private signing secret for authentication tokens |
| `APP_URL` | No | Public URL of the deployed app |

Keep `.env` private and never commit API keys, database credentials, or production secrets.
