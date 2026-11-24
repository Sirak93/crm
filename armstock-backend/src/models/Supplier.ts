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
import { SupplierStatus } from "armstock-shared";
import { Company } from "./Company";
import { UNIQUE_KEYS } from "../constants/UniqueKeys";

@Entity("suppliers")
@Unique(UNIQUE_KEYS.SUPPLIER_NAME, ["companyUuid", "name"])
export class Supplier {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column({ name: "company_uuid", type: "uuid" })
    companyUuid!: string;

    @ManyToOne(() => Company, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "company_uuid" })
    company?: Company;

    /** Firm name. */
    /** Case-insensitive, so the unique key ignores case. */
    @Column({ type: "citext" })
    name!: string;

    @Column({ name: "tax_id", type: "varchar", nullable: true })
    taxId!: string | null;

    @Column({ type: "text", nullable: true })
    note!: string | null;

    @Column({ type: "int", default: SupplierStatus.ACTIVE })
    status!: SupplierStatus;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
