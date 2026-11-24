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
import { RecipeStatus } from "armstock-shared";
import { Company } from "./Company";
import { User } from "./User";

/** Amounts are per 1 person; the name is unique per company ignoring case - checked by the service. */
@Entity("recipes")
@Index("IDX_recipes_company_uuid", ["companyUuid"])
export class Recipe {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column({ name: "company_uuid", type: "uuid" })
    companyUuid!: string;

    @ManyToOne(() => Company, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "company_uuid" })
    company?: Company;

    @Column()
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
