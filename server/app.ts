import express, { ErrorRequestHandler } from "express";
import { MulterError } from "multer";
import apiRouter from "./routes/api";
import { connectDB } from "./services/db";

const app = express();
let databaseConnection: Promise<boolean> | undefined;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", async (_req, _res, next) => {
  try {
    databaseConnection ??= connectDB();
    await databaseConnection;
    next();
  } catch (error) {
    next(error);
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.use("/api", apiRouter);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});

const apiErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const rawStatus = typeof error === "object" && error !== null && "status" in error
    ? error.status
    : undefined;
  const status = error instanceof MulterError
    ? error.code === "LIMIT_FILE_SIZE" ? 413 : 400
    : typeof rawStatus === "number" && rawStatus >= 400 && rawStatus < 600
      ? rawStatus
      : 500;

  if (status >= 500) {
    console.error("API request failed:", error);
  }

  res.status(status).json({
    error: error instanceof MulterError && error.code === "LIMIT_FILE_SIZE"
      ? "Resume files must be 4 MB or smaller."
      : status >= 500
        ? "Internal server error."
        : error instanceof Error
          ? error.message
          : "Invalid request."
  });
};

app.use(apiErrorHandler);

export default app;
