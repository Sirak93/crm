import type { IHealthStatus } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { RedisService } from "./RedisService";
import { AppLogger } from "../utils/AppLogger";

export class HealthService {
    static async getStatus(): Promise<IHealthStatus> {
        return {
            database: await this.isDatabaseUp(),
            redis: RedisService.isReady,
        };
    }

    private static async isDatabaseUp(): Promise<boolean> {
        try {
            await AppDataSource.query("SELECT 1");
            return true;
        } catch (err) {
            AppLogger.error("Health check: database query failed", err);
            return false;
        }
    }
}
