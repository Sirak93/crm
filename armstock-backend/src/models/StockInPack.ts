import { Column } from "typeorm";
import { MeasureUnit } from "armstock-shared";
import { numericTransformer } from "../utils/numericTransformer";

/** Embedded in `StockInLine` with `prefix: false` - the default naming would turn a prefix into camelCase (`packQuantity`). */
export class StockInPack {
    /** One pack's amount, in the product's unit. */
    @Column({ name: "pack_quantity", type: "numeric", precision: 14, scale: 3, transformer: numericTransformer })
    quantity!: number;

    /** The unit the amount was typed in - for showing only. */
    @Column({ name: "pack_unit", type: "int" })
    unit!: MeasureUnit;

    @Column({ name: "pack_count", type: "int" })
    count!: number;
}
