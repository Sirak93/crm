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
import { StockOutDepartment } from "armstock-shared";
import { StockOut } from "./StockOut";
import { Product } from "./Product";
import { numericTransformer } from "../utils/numericTransformer";

/** One row per product of the document - the total given out. The unique key also serves lookups by document. */
@Entity("stock_out_lines")
@Unique("UQ_stock_out_lines_stock_out_product", ["stockOutUuid", "productUuid"])
@Index("IDX_stock_out_lines_company_product", ["companyUuid", "productUuid"])
export class StockOutLine {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column({ name: "stock_out_uuid", type: "uuid" })
    stockOutUuid!: string;

    @ManyToOne(() => StockOut, { onDelete: "CASCADE" })
    @JoinColumn({ name: "stock_out_uuid" })
    stockOut?: StockOut;

    /** Copied from the document so stock queries filter by company without a join. */
    @Column({ name: "company_uuid", type: "uuid" })
    companyUuid!: string;

    @Column({ name: "product_uuid", type: "uuid" })
    productUuid!: string;

    @ManyToOne(() => Product, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "product_uuid" })
    product?: Product;

    /** Row order as typed (1, 2, 3...). */
    @Column({ type: "int" })
    position!: number;

    /** The total really given out - stock goes down by it. */
    @Column({ type: "numeric", precision: 14, scale: 3, transformer: numericTransformer })
    quantity!: number;

    /** Part typed as an extra (no recipe), 0 if none. In no sum - kept so the document shows what was typed. */
    @Column({ name: "extra_quantity", type: "numeric", precision: 14, scale: 3, default: 0, transformer: numericTransformer })
    extraQuantity!: number;

    /** Copied from the document so the kitchen balance sums without a join. */
    @Column({ type: "int", nullable: true })
    department!: StockOutDepartment | null;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
