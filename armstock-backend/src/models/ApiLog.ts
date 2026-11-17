import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from "typeorm";

/**
 * One row per API request, written by `ApiLogger` when API_DB_LOG_ENABLED=true.
 * No FK/join to `users` or `companies`: this table takes a write on every request,
 * so filter on the plain uuid columns.
 */
@Entity("api_logs")
@Index("IDX_api_logs_created_at", ["createdAt"])
export class ApiLog {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @Column()
    method!: string;

    @Column()
    path!: string;

    @Column({ name: "status_code" })
    statusCode!: number;

    @Column({ name: "duration_ms" })
    durationMs!: number;

    @Column()
    slow!: boolean;

    @Column()
    success!: boolean;

    @Column({ name: "user_uuid", type: "uuid", nullable: true })
    userUuid?: string | null;

    @Column({ name: "company_uuid", type: "uuid", nullable: true })
    companyUuid?: string | null;

    @Column({ type: "varchar", nullable: true })
    ip?: string | null;

    /** Redacted query + body + error - only set when `statusCode >= 400`. */
    @Column({ type: "jsonb", nullable: true })
    payload?: unknown;
}
