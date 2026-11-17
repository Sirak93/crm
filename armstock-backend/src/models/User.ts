import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Unique,
    Index,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { UserRole, UserStatus } from "armstock-shared";
import { Company } from "./Company";

@Entity("users")
@Unique("UQ_users_email", ["email"])
@Index("IDX_users_company_uuid", ["companyUuid"])
export class User {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    /** Always stored lowercased - login looks it up in that form. Optional for STAFF. */
    @Column({ type: "varchar", nullable: true })
    email!: string | null;

    /** bcrypt hash; null for STAFF, who cannot log in. */
    @Column({ type: "varchar", nullable: true })
    password!: string | null;

    /** Names and position are null for the Platform Owner. */
    @Column({ name: "first_name", type: "varchar", nullable: true })
    firstName!: string | null;

    @Column({ name: "last_name", type: "varchar", nullable: true })
    lastName!: string | null;

    @Column({ type: "varchar", nullable: true })
    position!: string | null;

    @Column({ type: "int" })
    role!: UserRole;

    @Column({ type: "int", default: UserStatus.ACTIVE })
    status!: UserStatus;

    /** Null for the Platform Owner. */
    @Column({ name: "company_uuid", type: "uuid", nullable: true })
    companyUuid!: string | null;

    @ManyToOne(() => Company, { nullable: true, onDelete: "RESTRICT" })
    @JoinColumn({ name: "company_uuid" })
    company?: Company | null;

    /** SHA-256 of the current refresh token; null after logout. */
    @Column({ name: "refresh_token", type: "varchar", nullable: true })
    refreshToken!: string | null;

    @Column({ name: "last_login_at", type: "timestamp", nullable: true })
    lastLoginAt!: Date | null;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
