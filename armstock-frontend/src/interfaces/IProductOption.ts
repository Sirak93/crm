import type { ProductStatus } from 'armstock-shared';

/** A product as a stock document row needs it. */
export interface IProductOption {
  uuid: string;
  name: string;
  code: string | null;
  status: ProductStatus;
  unitShortName: string;
  allowsDecimals: boolean;
}
