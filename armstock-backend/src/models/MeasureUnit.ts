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

/** Each company has its own list; new companies get the defaults. */
@Entity("measure_units")
@Unique(UNIQUE_KEYS.MEASURE_UNIT_NAME, ["companyUuid", "name"])
@Unique(UNIQUE_KEYS.MEASURE_UNIT_SHORT_NAME, ["companyUuid", "shortName"])
export class MeasureUnit {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column({ name: "company_uuid", type: "uuid" })
    companyUuid!: string;

    @ManyToOne(() => Company, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "company_uuid" })
    company?: Company;

    /** Case-insensitive, so the unique keys ignore case. */
    @Column({ type: "citext" })
    name!: string;

    @Column({ name: "short_name", type: "citext" })
    shortName!: string;

    @Column({ name: "allows_decimals", default: false })
    allowsDecimals!: boolean;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
