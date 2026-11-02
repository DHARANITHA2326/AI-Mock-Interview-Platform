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

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | For AI features | Google Gemini API key |
| `MONGODB_URI` | No | MongoDB connection string; otherwise the in-memory demo store is used |
| `JWT_SECRET` | Recommended in deployment | Private signing secret for authentication tokens |
| `APP_URL` | No | Public URL of the deployed app |

Keep `.env` private and never commit API keys, database credentials, or production secrets.
