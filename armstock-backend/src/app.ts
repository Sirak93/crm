import express from "express";
import cors from "cors";
import { API_PATH } from "armstock-shared";
import HealthRoutes from "./routes/HealthRoutes";
import { ErrorHandler } from "./middlewares/ErrorHandler";
import { RequestLoggerMiddleware } from "./middlewares/RequestLoggerMiddleware";
import { allowedOrigins } from "./utils/allowedOrigins";

const app = express();

// Behind Nginx / Cloudflare: use the real client IP.
app.set("trust proxy", 1);

const origins = allowedOrigins();

app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Requests with no origin (curl, server-to-server) are allowed.
        if (!origin || origins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        // Dev testing through an ngrok tunnel.
        "ngrok-skip-browser-warning",
    ],
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(RequestLoggerMiddleware);

app.use(`${API_PATH}/health`, HealthRoutes);

// Must be last.
app.use(ErrorHandler);

export default app;
