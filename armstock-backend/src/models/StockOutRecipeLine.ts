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
import { StockOutRecipe } from "./StockOutRecipe";
import { Product } from "./Product";
import { numericTransformer } from "../utils/numericTransformer";

/** A copy of a recipe line on the day of the stock-out - never changed after, so editing the recipe leaves the document as it was. */
@Entity("stock_out_recipe_lines")
@Index("IDX_stock_out_recipe_lines_stock_out_recipe_uuid", ["stockOutRecipeUuid"])
@Index("IDX_stock_out_recipe_lines_company_product", ["companyUuid", "productUuid"])
export class StockOutRecipeLine {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column({ name: "stock_out_recipe_uuid", type: "uuid" })
    stockOutRecipeUuid!: string;

    @ManyToOne(() => StockOutRecipe, { onDelete: "CASCADE" })
    @JoinColumn({ name: "stock_out_recipe_uuid" })
    stockOutRecipe?: StockOutRecipe;

    /** Copied from the document so queries filter by company without a join. */
    @Column({ name: "company_uuid", type: "uuid" })
    companyUuid!: string;

    @Column({ name: "product_uuid", type: "uuid" })
    productUuid!: string;

    @ManyToOne(() => Product, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "product_uuid" })
    product?: Product;

    /** Same order as in the recipe. */
    @Column({ type: "int" })
    position!: number;

    /** Per 1 person, in the product's own unit, as the recipe had it that day. */
    @Column({ type: "numeric", precision: 14, scale: 6, transformer: numericTransformer })
    quantity!: number;

    /** quantity × persons - kept so the kitchen balance sums without a join. */
    @Column({ name: "needed_quantity", type: "numeric", precision: 14, scale: 6, transformer: numericTransformer })
    neededQuantity!: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
