import { In } from "typeorm";
import type { IApiLog, IApiLogUser, IPaginationMeta } from "armstock-shared";
import { AppDataSource } from "../../config/database";
import { ApiLog } from "../../models/ApiLog";
import { User } from "../../models/User";
import type { PlatformLogsQuery } from "../../schemas/platform/PlatformLogsSchema";

export class PlatformLogsService {
    private repo = AppDataSource.getRepository(ApiLog);

    async list(query: PlatformLogsQuery): Promise<{ items: IApiLog[]; meta: IPaginationMeta }> {
        const { page, pageSize, method, path, ip, slow, success, dateFrom, dateTo } = query;

        const qb = this.repo.createQueryBuilder("log");
        if (method) qb.andWhere("log.method = :method", { method });
        if (path) qb.andWhere("log.path ILIKE :path", { path: `%${path}%` });
        if (ip) qb.andWhere("log.ip ILIKE :ip", { ip: `%${ip}%` });
        if (slow !== undefined) qb.andWhere("log.slow = :slow", { slow });
        if (success !== undefined) qb.andWhere("log.success = :success", { success });
        if (dateFrom) qb.andWhere("log.createdAt >= :dateFrom", { dateFrom });
        if (dateTo) qb.andWhere("log.createdAt <= :dateTo", { dateTo });

        const [rows, total] = await qb
            .orderBy("log.createdAt", "DESC")
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();

        return {
            items: await this.withUsers(rows),
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        };
    }

    async clear(): Promise<void> {
        await this.repo.clear();
    }

    /**
     * Resolves the few users on one page with a bounded `uuid IN (...)` lookup instead of a
     * join on `api_logs` - a join on a paginated query forces slow DISTINCT-id paging.
     */
    private async withUsers(rows: ApiLog[]): Promise<IApiLog[]> {
        const userUuids = [...new Set(rows.map((row) => row.userUuid).filter((uuid): uuid is string => !!uuid))];
        const users = userUuids.length
            ? await AppDataSource.getRepository(User).find({ where: { uuid: In(userUuids) }, select: { uuid: true, email: true } })
            : [];
        const userMap = new Map<string, IApiLogUser>(users.map((u) => [u.uuid, { uuid: u.uuid, email: u.email }]));

        return rows.map((log) => ({
            uuid: log.uuid,
            createdAt: log.createdAt.toISOString(),
            method: log.method,
            path: log.path,
            statusCode: log.statusCode,
            durationMs: log.durationMs,
            slow: log.slow,
            success: log.success,
            user: log.userUuid ? userMap.get(log.userUuid) ?? null : null,
            // Companies do not exist yet; resolved the same way once they do.
            company: null,
            ip: log.ip ?? null,
            payload: log.payload ?? null,
        }));
    }
}
