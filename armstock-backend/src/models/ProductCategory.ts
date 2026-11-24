import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Unique,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { Company } from "./Company";
import { UNIQUE_KEYS } from "../constants/UniqueKeys";

/** A flat list per company - no sub-categories. */
@Entity("product_categories")
@Unique(UNIQUE_KEYS.PRODUCT_CATEGORY_NAME, ["companyUuid", "name"])
export class ProductCategory {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column({ name: "company_uuid", type: "uuid" })
    companyUuid!: string;

    @ManyToOne(() => Company, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "company_uuid" })
    company?: Company;

    /** Case-insensitive, so the unique key ignores case. */
    @Column({ type: "citext" })
    name!: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
