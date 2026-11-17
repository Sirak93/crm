import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

// Before the other imports: app.ts reads ALLOWED_ORIGINS and RedisConfig reads REDIS_* as they load.
import { requireEnv } from "./utils/requireEnv";
requireEnv("PORT", "ALLOWED_ORIGINS", "DB_HOST", "DB_PORT", "DB_USERNAME", "DB_NAME", "REDIS_HOST", "REDIS_PORT", "SLOW_REQUEST_THRESHOLD_MS",
    "JWT_SECRET", "JWT_EXPIRES_IN", "JWT_REFRESH_SECRET", "JWT_REFRESH_EXPIRES_IN");

import { AppDataSource } from "./config/database";
import app from "./app";
import { AppLogger } from "./utils/AppLogger";
import { RedisService } from "./services/RedisService";

const PORT = process.env.PORT!;

const bootstrap = async () => {
    try {
        // 1. Database
        await AppDataSource.initialize();
        AppLogger.success("Database connected");

        // 2. Redis (non-fatal - the app must boot even if Redis is down)
        try {
            await RedisService.initialize();
            AppLogger.success("Redis connected");
        } catch (err) {
            AppLogger.warn("Redis unavailable - continuing without it:", err);
        }

        // 3. Server
        app.listen(PORT, () => {
            AppLogger.success(`Server running on port ${PORT}`);
        });
    } catch (err) {
        AppLogger.error("Server Initialization Error:", err);
        process.exit(1);
    }
};

bootstrap();
