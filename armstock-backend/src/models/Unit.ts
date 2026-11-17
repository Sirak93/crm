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
import { Company } from "./Company";

/** Each company has its own list; new companies get the defaults. */
@Entity("units")
@Index("IDX_units_company_uuid", ["companyUuid"])
export class Unit {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column({ name: "company_uuid", type: "uuid" })
    companyUuid!: string;

    @ManyToOne(() => Company, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "company_uuid" })
    company?: Company;

    @Column()
    name!: string;

    @Column({ name: "short_name" })
    shortName!: string;

    @Column({ name: "allows_decimals", default: false })
    allowsDecimals!: boolean;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
