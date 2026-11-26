/** What a barcode scan adds 1 to on a form row - the quantity, or the pack count on a stock-in. */
export interface IScanCount<T> {
  get: (line: T) => number | undefined;
  set: (line: T, value: number) => void;
}
