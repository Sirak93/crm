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
import { Recipe } from "./Recipe";
import { Product } from "./Product";
import { numericTransformer } from "../utils/numericTransformer";

/** One product of a recipe. The unique key also serves lookups by recipe. */
@Entity("recipe_lines")
@Unique("UQ_recipe_lines_recipe_product", ["recipeUuid", "productUuid"])
@Index("IDX_recipe_lines_company_product", ["companyUuid", "productUuid"])
export class RecipeLine {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column({ name: "recipe_uuid", type: "uuid" })
    recipeUuid!: string;

    @ManyToOne(() => Recipe, { onDelete: "CASCADE" })
    @JoinColumn({ name: "recipe_uuid" })
    recipe?: Recipe;

    /** Copied from the recipe so queries filter by company without a join. */
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

    /** Per 1 person, in the product's own unit. */
    @Column({ type: "numeric", precision: 14, scale: 6, transformer: numericTransformer })
    quantity!: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
