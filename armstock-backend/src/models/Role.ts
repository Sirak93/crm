import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { Permission } from "armstock-shared";
import { Company } from "./Company";

/** A company role: a name plus the starting permissions copied to its users - a template only. */
@Entity("roles")
@Index("IDX_roles_company_uuid", ["companyUuid"])
export class Role {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column({ name: "company_uuid", type: "uuid" })
    companyUuid!: string;

    @ManyToOne(() => Company, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "company_uuid" })
    company?: Company;

    @Column()
    name!: string;

    @Column({ type: "int", array: true, default: () => "'{}'" })
    permissions!: Permission[];

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
