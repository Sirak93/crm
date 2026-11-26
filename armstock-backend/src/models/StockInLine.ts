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
import { StockIn } from "./StockIn";
import { Product } from "./Product";
import { numericTransformer } from "../utils/numericTransformer";

@Entity("stock_in_lines")
@Index("IDX_stock_in_lines_stock_in_uuid", ["stockInUuid"])
@Index("IDX_stock_in_lines_company_product", ["companyUuid", "productUuid"])
export class StockInLine {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column({ name: "stock_in_uuid", type: "uuid" })
    stockInUuid!: string;

    @ManyToOne(() => StockIn, { onDelete: "CASCADE" })
    @JoinColumn({ name: "stock_in_uuid" })
    stockIn?: StockIn;

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
