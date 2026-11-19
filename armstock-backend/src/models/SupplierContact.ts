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
import { Supplier } from "./Supplier";

/** A person at the supplier firm, e.g. the manager who takes orders or the driver. */
@Entity("supplier_contacts")
@Index("IDX_supplier_contacts_supplier_uuid", ["supplierUuid"])
export class SupplierContact {
    @PrimaryGeneratedColumn("uuid")
    uuid!: string;

    @Column({ name: "supplier_uuid", type: "uuid" })
    supplierUuid!: string;

    @ManyToOne(() => Supplier, { onDelete: "CASCADE" })
    @JoinColumn({ name: "supplier_uuid" })
    supplier?: Supplier;

    @Column()
    name!: string;

    @Column({ type: "varchar", nullable: true })
    position!: string | null;

    @Column({ type: "varchar", nullable: true })
    phone!: string | null;

    @Column({ type: "text", nullable: true })
    note!: string | null;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
