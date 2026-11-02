import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import apiRouter from "./server/routes/api";
import { connectDB } from "./server/services/db";

// Initialize environment variables
dotenv.config();

async function startServer() {
  // Connect to database (with graceful interactive in-memory fallback)
  try {
    await connectDB();
  } catch (err) {
    console.warn("Database connection warning, continuing with in-memory fallback:", err);
  }

  const app = express();
  const PORT = 3000;

  // Global Middlewares
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Mount Backend API Router
  app.use("/api", apiRouter);

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Serve static assets or mount Vite in development
  if (process.env.NODE_ENV === "production" && fs.existsSync(path.join(process.cwd(), "dist"))) {
    console.log("Starting backend in production mode serving static artifacts...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    console.log("Starting backend in development mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Fallback: Serve index.html transformed by Vite for all navigation requests
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(process.cwd(), "index.html");
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        if (vite) {
          vite.ssrFixStacktrace(e as Error);
        }
        next(e);
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`InterviewMaster AI Server successfully running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Critical boot failure in startServer:", error);
});
