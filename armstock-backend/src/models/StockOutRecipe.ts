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
import { StockOut } from "./StockOut";
import { Recipe } from "./Recipe";

/** A recipe row of a stock-out. The unique key also serves lookups by document. */
@Entity("stock_out_recipes")
@Unique("UQ_stock_out_recipes_stock_out_recipe", ["stockOutUuid", "recipeUuid"])
@Index("IDX_stock_out_recipes_recipe_uuid", ["recipeUuid"])
export class StockOutRecipe {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column({ name: "stock_out_uuid", type: "uuid" })
    stockOutUuid!: string;

    @ManyToOne(() => StockOut, { onDelete: "CASCADE" })
    @JoinColumn({ name: "stock_out_uuid" })
    stockOut?: StockOut;

    /** Copied from the document so queries filter by company without a join. */
    @Column({ name: "company_uuid", type: "uuid" })
    companyUuid!: string;

    @Column({ name: "recipe_uuid", type: "uuid" })
    recipeUuid!: string;

    @ManyToOne(() => Recipe, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "recipe_uuid" })
    recipe?: Recipe;

    /** Row order as typed (1, 2, 3...). */
    @Column({ type: "int" })
    position!: number;

    @Column({ type: "int" })
    persons!: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
