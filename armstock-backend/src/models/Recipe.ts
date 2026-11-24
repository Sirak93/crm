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
import { RecipeStatus } from "armstock-shared";
import { Company } from "./Company";
import { UNIQUE_KEYS } from "../constants/UniqueKeys";
import { User } from "./User";

/** Amounts are per 1 person. */
@Entity("recipes")
@Unique(UNIQUE_KEYS.RECIPE_NAME, ["companyUuid", "name"])
export class Recipe {
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

    @Column({ type: "text", nullable: true })
    note!: string | null;

    @Column({ type: "int", default: RecipeStatus.ACTIVE })
    status!: RecipeStatus;

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
