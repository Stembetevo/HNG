import express from "express";
import cors from "cors";
import classifyRoutes from "./routes/routes.js";
import errorHandler from "./middleware/errorHandler.js";

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

app.use("/api", classifyRoutes);

app.use(errorHandler);

export default app;