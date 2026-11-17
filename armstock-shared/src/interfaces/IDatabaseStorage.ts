import type { ITableStorage } from "./ITableStorage";
import type { IUnusedIndex } from "./IUnusedIndex";

export interface IDatabaseStorage {
    databaseName: string;
    /** Everything PostgreSQL stores for this database, including catalogs. */
    databaseSizeBytes: number;
    /** Sum of the listed tables' totals - always ≤ databaseSizeBytes. */
    totalTableSizeBytes: number;
    totalHeapSizeBytes: number;
    totalIndexSizeBytes: number;
    totalToastSizeBytes: number;
    tableCount: number;
    totalRowCount: number;
    /** Scan counters and unused indexes only mean something relative to this moment. */
    statsResetAt: string | null;
    generatedAt: string;
    tables: ITableStorage[];
    unusedIndexes: IUnusedIndex[];
}
