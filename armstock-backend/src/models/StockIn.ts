import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    Unique,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { StockInReason } from "armstock-shared";
import { Company } from "./Company";
import { Supplier } from "./Supplier";
import { User } from "./User";

/** Stock-in document header. Stock is never stored - it is summed from the lines. */
@Entity("stock_ins")
@Unique("UQ_stock_ins_company_year_number", ["companyUuid", "year", "number"])
@Index("IDX_stock_ins_company_date", ["companyUuid", "date"])
@Index("IDX_stock_ins_supplier_uuid", ["supplierUuid"])
export class StockIn {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column({ name: "company_uuid", type: "uuid" })
    companyUuid!: string;

    @ManyToOne(() => Company, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "company_uuid" })
    company?: Company;

    /** Year of creation - the number counter restarts each year. */
    @Column({ type: "int" })
    year!: number;

    /** Counter per company and year, shown as IN-2026-0015. */
    @Column({ type: "int" })
    number!: number;

    @Column({ type: "int" })
    reason!: StockInReason;

    /** When the goods came in; the user may set an earlier time. */
    @Column({ type: "timestamp" })
    date!: Date;

    @Column({ name: "supplier_uuid", type: "uuid", nullable: true })
    supplierUuid!: string | null;

    @ManyToOne(() => Supplier, { nullable: true, onDelete: "RESTRICT" })
    @JoinColumn({ name: "supplier_uuid" })
    supplier?: Supplier | null;

    @Column({ name: "invoice_number", type: "varchar", nullable: true })
    invoiceNumber!: string | null;

    @Column({ type: "text", nullable: true })
    note!: string | null;

    @Column({ name: "created_by_uuid", type: "uuid" })
    createdByUuid!: string;

    @ManyToOne(() => User, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "created_by_uuid" })
    createdBy?: User;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
