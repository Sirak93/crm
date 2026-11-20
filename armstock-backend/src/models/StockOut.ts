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
import { StockOutDepartment, StockOutReason } from "armstock-shared";
import { Company } from "./Company";
import { Supplier } from "./Supplier";
import { User } from "./User";

/** Stock-out document header. Stock is never stored - it is summed from the lines. */
@Entity("stock_outs")
@Unique("UQ_stock_outs_company_year_number", ["companyUuid", "year", "number"])
@Index("IDX_stock_outs_company_date", ["companyUuid", "date"])
@Index("IDX_stock_outs_supplier_uuid", ["supplierUuid"])
@Index("IDX_stock_outs_receiver_uuid", ["receiverUuid"])
export class StockOut {
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

    /** Counter per company and year, shown as OUT-2026-0015. */
    @Column({ type: "int" })
    number!: number;

    @Column({ type: "int" })
    reason!: StockOutReason;

    /** When the goods went out; the user may set an earlier time. */
    @Column({ type: "timestamp" })
    date!: Date;

    /** Returned only. */
    @Column({ name: "supplier_uuid", type: "uuid", nullable: true })
    supplierUuid!: string | null;

    @ManyToOne(() => Supplier, { nullable: true, onDelete: "RESTRICT" })
    @JoinColumn({ name: "supplier_uuid" })
    supplier?: Supplier | null;

    /** Issued only. */
    @Column({ type: "int", nullable: true })
    department!: StockOutDepartment | null;

    /** Issued only, optional - any company user, Staff included. */
    @Column({ name: "receiver_uuid", type: "uuid", nullable: true })
    receiverUuid!: string | null;

    @ManyToOne(() => User, { nullable: true, onDelete: "RESTRICT" })
    @JoinColumn({ name: "receiver_uuid" })
    receiver?: User | null;

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
