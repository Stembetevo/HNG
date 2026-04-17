import express from "express";
import cors from "cors";
import classifyRoutes from "./routes/routes.js";
import errorHandler from "./middleware/errorHandler.js";
import { statusError } from "./utils/response.js";

const app = express();

app.use(
    cors({
        origin: "*"
    })
);

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
});

app.use(express.json());

app.get("/", (req, res) => {
    return res.status(200).json({
        status: "success",
        message: "API integration backend is running"
    });
});

app.use("/api", classifyRoutes);

app.use((req, res) => {
    return statusError(res, "Route not found", 404);
});

app.use(errorHandler);

export default app;