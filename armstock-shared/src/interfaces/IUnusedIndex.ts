/** An index never used since the last stats reset. */
export interface IUnusedIndex {
    schema: string;
    table: string;
    index: string;
    sizeBytes: number;
}
