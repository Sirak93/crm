import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from "typeorm";
import { CompanyStatus } from "armstock-shared";

@Entity("companies")
export class Company {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column()
    name!: string;

    @Column({ name: "tax_id", type: "varchar", nullable: true })
    taxId!: string | null;

    @Column({ type: "varchar", nullable: true })
    phone!: string | null;

    @Column({ type: "varchar", nullable: true })
    email!: string | null;

    @Column({ type: "varchar", nullable: true })
    address!: string | null;

    /** File path; no upload yet. */
    @Column({ type: "varchar", nullable: true })
    logo!: string | null;

    @Column({ type: "int", default: CompanyStatus.ACTIVE })
    status!: CompanyStatus;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
