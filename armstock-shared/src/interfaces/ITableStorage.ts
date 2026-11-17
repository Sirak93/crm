/** Storage and health figures for one table. Bytes are exact; row counts are planner estimates. */
export interface ITableStorage {
    schema: string;
    table: string;
    /** Planner estimate (refreshed by ANALYZE) - an exact count would scan every table. */
    rowCount: number;
    /** Rows deleted/updated but not yet reclaimed by VACUUM. */
    deadRowCount: number;
    deadRowPercent: number;
    /** Heap + TOAST + indexes. */
    totalSizeBytes: number;
    tableSizeBytes: number;
    indexSizeBytes: number;
    toastSizeBytes: number;
    indexCount: number;
    /** indexSizeBytes / tableSizeBytes. Above 1 means the indexes outweigh the data. */
    indexToTableRatio: number;
    avgRowSizeBytes: number;
    percentOfDatabase: number;
    /** High with low indexScans hints at a missing index. */
    seqScans: number;
    indexScans: number;
    lastVacuumAt: string | null;
    lastAnalyzeAt: string | null;
}
