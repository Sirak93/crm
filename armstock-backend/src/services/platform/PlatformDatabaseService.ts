import type { IDatabaseStorage, ITableStorage, IUnusedIndex } from "armstock-shared";
import { AppDataSource } from "../../config/database";

/**
 * pg_total_relation_size = heap + TOAST + indexes, so heap is pg_table_size minus TOAST -
 * that keeps heap + toast + indexes equal to the total.
 */
const TABLE_STORAGE_QUERY = `
    SELECT
        n.nspname                                                       AS "schema",
        c.relname                                                       AS "table",
        GREATEST(COALESCE(s.n_live_tup, 0), COALESCE(NULLIF(c.reltuples, -1), 0))::bigint AS "rowCount",
        COALESCE(s.n_dead_tup, 0)::bigint                               AS "deadRowCount",
        pg_total_relation_size(c.oid)::bigint                           AS "totalSizeBytes",
        (pg_table_size(c.oid) - COALESCE(pg_total_relation_size(c.reltoastrelid), 0))::bigint AS "tableSizeBytes",
        pg_indexes_size(c.oid)::bigint                                  AS "indexSizeBytes",
        COALESCE(pg_total_relation_size(c.reltoastrelid), 0)::bigint    AS "toastSizeBytes",
        (SELECT count(*) FROM pg_index i WHERE i.indrelid = c.oid)::int AS "indexCount",
        COALESCE(s.seq_scan, 0)::bigint                                 AS "seqScans",
        COALESCE(s.idx_scan, 0)::bigint                                 AS "indexScans",
        GREATEST(s.last_vacuum, s.last_autovacuum)                      AS "lastVacuumAt",
        GREATEST(s.last_analyze, s.last_autoanalyze)                    AS "lastAnalyzeAt"
    FROM pg_class c
             JOIN pg_namespace n ON n.oid = c.relnamespace
             LEFT JOIN pg_stat_all_tables s ON s.relid = c.oid
    WHERE c.relkind = 'r'
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND n.nspname NOT LIKE 'pg_toast%'
    ORDER BY pg_total_relation_size(c.oid) DESC
`;

const DATABASE_SIZE_QUERY = `
    SELECT
        current_database()                            AS "databaseName",
        pg_database_size(current_database())::bigint  AS "databaseSizeBytes",
        (SELECT stats_reset FROM pg_stat_database WHERE datname = current_database()) AS "statsResetAt"
`;

/** Primary keys and unique indexes enforce constraints, so they are never "unused". */
const UNUSED_INDEX_QUERY = `
    SELECT
        n.nspname                       AS "schema",
        t.relname                       AS "table",
        i.relname                       AS "index",
        pg_relation_size(i.oid)::bigint AS "sizeBytes"
    FROM pg_stat_all_indexes s
             JOIN pg_class i ON i.oid = s.indexrelid
             JOIN pg_class t ON t.oid = s.relid
             JOIN pg_namespace n ON n.oid = t.relnamespace
             JOIN pg_index x ON x.indexrelid = i.oid
    WHERE COALESCE(s.idx_scan, 0) = 0
      AND NOT x.indisunique
      AND NOT x.indisprimary
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND pg_relation_size(i.oid) > 0
    ORDER BY pg_relation_size(i.oid) DESC
    LIMIT $1
`;

const UNUSED_INDEX_LIMIT = 20;

/** node-postgres returns bigint as a string to avoid precision loss. */
const toNumber = (value: unknown): number => Number(value ?? 0) || 0;

const toIso = (value: Date | null | undefined): string | null => (value ? new Date(value).toISOString() : null);

const percent = (part: number, whole: number): number =>
    whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;

const ratio = (part: number, whole: number): number =>
    whole > 0 ? Math.round((part / whole) * 100) / 100 : 0;

export class PlatformDatabaseService {
    /** Reads only PostgreSQL's catalogs and stats, so cost follows the number of tables, not the data size. */
    async getStorage(): Promise<IDatabaseStorage> {
        const [rawTables, [dbInfo], rawUnusedIndexes] = await Promise.all([
            AppDataSource.query(TABLE_STORAGE_QUERY),
            AppDataSource.query(DATABASE_SIZE_QUERY),
            AppDataSource.query(UNUSED_INDEX_QUERY, [UNUSED_INDEX_LIMIT]),
        ]);

        const databaseSizeBytes = toNumber(dbInfo?.databaseSizeBytes);

        const tables: ITableStorage[] = rawTables.map((row: any) => {
            const rowCount = toNumber(row.rowCount);
            const deadRowCount = toNumber(row.deadRowCount);
            const totalSizeBytes = toNumber(row.totalSizeBytes);
            const tableSizeBytes = toNumber(row.tableSizeBytes);
            const indexSizeBytes = toNumber(row.indexSizeBytes);

            return {
                schema: row.schema,
                table: row.table,
                rowCount,
                deadRowCount,
                deadRowPercent: percent(deadRowCount, rowCount + deadRowCount),
                totalSizeBytes,
                tableSizeBytes,
                indexSizeBytes,
                toastSizeBytes: toNumber(row.toastSizeBytes),
                indexCount: toNumber(row.indexCount),
                indexToTableRatio: ratio(indexSizeBytes, tableSizeBytes),
                avgRowSizeBytes: rowCount > 0 ? Math.round(totalSizeBytes / rowCount) : 0,
                percentOfDatabase: percent(totalSizeBytes, databaseSizeBytes),
                seqScans: toNumber(row.seqScans),
                indexScans: toNumber(row.indexScans),
                lastVacuumAt: toIso(row.lastVacuumAt),
                lastAnalyzeAt: toIso(row.lastAnalyzeAt),
            };
        });

        const sum = (pick: (table: ITableStorage) => number) =>
            tables.reduce((total, table) => total + pick(table), 0);

        const unusedIndexes: IUnusedIndex[] = rawUnusedIndexes.map((row: any) => ({
            schema: row.schema,
            table: row.table,
            index: row.index,
            sizeBytes: toNumber(row.sizeBytes),
        }));

        return {
            databaseName: dbInfo?.databaseName ?? "",
            databaseSizeBytes,
            totalTableSizeBytes: sum((t) => t.totalSizeBytes),
            totalHeapSizeBytes: sum((t) => t.tableSizeBytes),
            totalIndexSizeBytes: sum((t) => t.indexSizeBytes),
            totalToastSizeBytes: sum((t) => t.toastSizeBytes),
            tableCount: tables.length,
            totalRowCount: sum((t) => t.rowCount),
            statsResetAt: toIso(dbInfo?.statsResetAt),
            generatedAt: new Date().toISOString(),
            tables,
            unusedIndexes,
        };
    }
}
