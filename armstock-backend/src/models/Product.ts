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
import { MeasureUnit, ProductReceivedAs, ProductStatus } from "armstock-shared";
import { Company } from "./Company";
import { UNIQUE_KEYS } from "../constants/UniqueKeys";
import { ProductCategory } from "./ProductCategory";

@Entity("products")
@Index("IDX_products_company_uuid", ["companyUuid"])
@Index("IDX_products_category_uuid", ["categoryUuid"])
@Index(UNIQUE_KEYS.PRODUCT_BARCODE, ["companyUuid", "barcode"], { unique: true })
@Unique(UNIQUE_KEYS.PRODUCT_CODE, ["companyUuid", "code"])
export class Product {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column({ name: "company_uuid", type: "uuid" })
    companyUuid!: string;

    @ManyToOne(() => Company, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "company_uuid" })
    company?: Company;

    @Column()
    name!: string;

    /** Case-insensitive, so the unique key ignores case. */
    @Column({ type: "citext", nullable: true })
    code!: string | null;

    /** Factory barcode, separate from the company's own code/SKU. */
    @Column({ type: "varchar", nullable: true })
    barcode!: string | null;

    /** Fixed after create - stock is counted in this unit. */
    @Column({ name: "measure_unit", type: "int" })
    measureUnit!: MeasureUnit;

    /** Which fields the stock-in line shows - a form setting, stock-in never checks it. */
    @Column({ name: "received_as", type: "int", default: ProductReceivedAs.LOOSE })
    receivedAs!: ProductReceivedAs;

    @Column({ name: "category_uuid", type: "uuid" })
    categoryUuid!: string;

    @ManyToOne(() => ProductCategory, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "category_uuid" })
    category?: ProductCategory;

    @Column({ type: "int", default: ProductStatus.ACTIVE })
    status!: ProductStatus;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
