import express from "express";
import cors from "cors";
import classifyRoutes from "./routes/routes.js";
import authRoutes from "./routes/authRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import { statusError } from "./utils/response.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { apiVersionMiddleware } from "./middleware/apiVersion.js";
import config from "./config/index.js";

const app = express();

app.use(
    cors({
        origin: config.corsOrigin,
        credentials: true
    })
);

app.use(express.json());
app.use(loggingMiddleware);

app.get("/", (req, res) => {
    return res.status(200).json({
        status: "success",
        message: "Insighta Labs+ API is running",
        version: "1.0.0"
    });
});

// Authentication routes (no version required)
app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);

// Profile API routes (version required)
app.use("/api", apiVersionMiddleware, classifyRoutes);

app.use((req, res) => {
    return statusError(res, "Route not found", 404);
});

app.use(errorHandler);

export default app;