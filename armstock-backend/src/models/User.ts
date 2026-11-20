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
import { AccountType, UserStatus, type Permission } from "armstock-shared";
import { Company } from "./Company";
import { Role } from "./Role";

@Entity("users")
@Unique("UQ_users_email", ["email"])
@Index("IDX_users_company_uuid", ["companyUuid"])
@Index("IDX_users_role_uuid", ["roleUuid"])
export class User {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    /** Always stored lowercased - login looks it up in that form. Null without login. */
    @Column({ type: "varchar", nullable: true })
    email!: string | null;

    /** bcrypt hash; null without login. */
    @Column({ type: "varchar", nullable: true })
    password!: string | null;

    /** Names and position are null for the Platform Owner. */
    @Column({ name: "first_name", type: "varchar", nullable: true })
    firstName!: string | null;

    @Column({ name: "last_name", type: "varchar", nullable: true })
    lastName!: string | null;

    @Column({ type: "varchar", nullable: true })
    position!: string | null;

    @Column({ name: "account_type", type: "int" })
    accountType!: AccountType;

    /** The company role - members only, null for owners. */
    @Column({ name: "role_uuid", type: "uuid", nullable: true })
    roleUuid!: string | null;

    @ManyToOne(() => Role, { nullable: true, onDelete: "RESTRICT" })
    @JoinColumn({ name: "role_uuid" })
    companyRole?: Role | null;

    /** The user's own full list, copied from the role and then edited. Empty for owners and without login. */
    @Column({ type: "int", array: true, default: () => "'{}'" })
    permissions!: Permission[];

    /** No login = no email, no password, no permissions; can still be a stock-out receiver. */
    @Column({ name: "can_log_in", type: "boolean", default: true })
    canLogIn!: boolean;

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
