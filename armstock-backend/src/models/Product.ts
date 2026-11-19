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
import { ProductStatus } from "armstock-shared";
import { Company } from "./Company";
import { MeasureUnit } from "./MeasureUnit";
import { ProductCategory } from "./ProductCategory";

/** No price field - its price is the average of all its stock-ins, calculated, never stored. */
@Entity("products")
@Index("IDX_products_company_uuid", ["companyUuid"])
@Index("IDX_products_measure_unit_uuid", ["measureUnitUuid"])
@Index("IDX_products_category_uuid", ["categoryUuid"])
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

    @Column({ type: "varchar", nullable: true })
    code!: string | null;

    /** Fixed after create - stock and prices are counted in this unit. */
    @Column({ name: "measure_unit_uuid", type: "uuid" })
    measureUnitUuid!: string;

    @ManyToOne(() => MeasureUnit, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "measure_unit_uuid" })
    measureUnit?: MeasureUnit;

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
