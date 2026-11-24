import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Unique,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { Permission } from "armstock-shared";
import { Company } from "./Company";
import { UNIQUE_KEYS } from "../constants/UniqueKeys";

/** A company role: a name plus the starting permissions copied to its users - a template only. */
@Entity("roles")
@Unique(UNIQUE_KEYS.ROLE_NAME, ["companyUuid", "name"])
export class Role {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column({ name: "company_uuid", type: "uuid" })
    companyUuid!: string;

    @ManyToOne(() => Company, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "company_uuid" })
    company?: Company;

    /** Case-insensitive, so the unique key ignores case. */
    @Column({ type: "citext" })
    name!: string;

    @Column({ type: "int", array: true, default: () => "'{}'" })
    permissions!: Permission[];

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
