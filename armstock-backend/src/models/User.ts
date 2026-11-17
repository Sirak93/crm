import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Unique,
} from "typeorm";
import { UserRole } from "armstock-shared";

@Entity("users")
@Unique("UQ_users_email", ["email"])
export class User {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    /** Always stored lowercased - login looks it up in that form. */
    @Column()
    email!: string;

    @Column()
    password!: string;

    @Column({ type: "int" })
    role!: UserRole;

    @Column({ name: "is_active", default: true })
    isActive!: boolean;

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
