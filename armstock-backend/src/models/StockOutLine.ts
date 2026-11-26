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
import { StockOut } from "./StockOut";
import { Product } from "./Product";
import { numericTransformer } from "../utils/numericTransformer";

@Entity("stock_out_lines")
@Index("IDX_stock_out_lines_stock_out_uuid", ["stockOutUuid"])
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

    @Column({ type: "numeric", precision: 14, scale: 3, transformer: numericTransformer })
    quantity!: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
