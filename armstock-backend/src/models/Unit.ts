import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from "typeorm";

/** One global list shared by all companies. */
@Entity("units")
export class Unit {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

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
