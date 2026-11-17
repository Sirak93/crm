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
    OneToOne,
} from "typeorm";
import { UserRole, UserStatus } from "armstock-shared";
import { Company } from "./Company";
import { CompanyStaff } from "./CompanyStaff";

@Entity("users")
@Unique("UQ_users_email", ["email"])
@Index("IDX_users_company_uuid", ["companyUuid"])
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

    @Column({ type: "int", default: UserStatus.ACTIVE })
    status!: UserStatus;

    /** Null for the Platform Owner. */
    @Column({ name: "company_uuid", type: "uuid", nullable: true })
    companyUuid!: string | null;

    @ManyToOne(() => Company, { nullable: true, onDelete: "RESTRICT" })
    @JoinColumn({ name: "company_uuid" })
    company?: Company | null;

    /** At most one login per staff member (OneToOne adds the unique constraint); null for the Platform Owner. */
    @Column({ name: "staff_uuid", type: "uuid", nullable: true })
    staffUuid!: string | null;

    @OneToOne(() => CompanyStaff, { nullable: true, onDelete: "RESTRICT" })
    @JoinColumn({ name: "staff_uuid" })
    staff?: CompanyStaff | null;

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
