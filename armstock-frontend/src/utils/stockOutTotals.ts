import {
  MEASURE_UNITS,
  QUANTITY_DECIMALS,
  RECIPE_QUANTITY_DECIMALS,
  type IRecipeOption,
  type IStockLineProduct,
  type IStockOutRecipe,
} from 'armstock-shared';
import type { IStockOutLineForm } from '../interfaces/IStockOutLineForm';
import type { IStockOutRecipeForm } from '../interfaces/IStockOutRecipeForm';
import type { IStockOutTotalRow } from '../interfaces/IStockOutTotalRow';
import { nextLineKey } from './stockLines';

// Every sum goes through toFixed, so float noise never adds up (0.1 + 0.2 = 0.3).
const round = (value: number, decimals: number): number => Number(value.toFixed(decimals));

/** Recipe amount × persons, as the backend saves it. */
export const neededQuantity = (perPerson: number, persons: number): number => round(perPerson * persons, RECIPE_QUANTITY_DECIMALS);

/**
 * Rounded up - count units to a whole number, kg / l to 3 decimals - so the total is never below what
 * the recipes need. Float noise is cleared first, else 1.5000000001 would become 1.501.
 */
export const roundUpTotal = (value: number, product: IStockLineProduct): number => {
  const decimals = MEASURE_UNITS[product.measureUnit].allowsDecimals ? QUANTITY_DECIMALS : 0;
  const scale = 10 ** decimals;
  return round(Math.ceil(round(value * scale, RECIPE_QUANTITY_DECIMALS)) / scale, decimals);
};

export const emptyRecipeRow = (persons?: number): IStockOutRecipeForm => ({ key: nextLineKey(), recipeUuid: '', persons });

/** A doc's recipe row as a picker option, working from the doc's saved copy instead of the current recipe. */
export const toSavedRecipeOption = (row: IStockOutRecipe): IRecipeOption => ({
  uuid: row.recipe.uuid,
  name: row.recipe.name,
  lines: row.lines.map(({ uuid, product, quantity }) => ({ uuid, product, quantity })),
});

/** An extras row nothing was typed in yet - left out of the document. */
export const isBlankOutLine = (line: IStockOutLineForm): boolean => !line.productUuid && line.quantity === undefined;

/** Each product of the recipes and extras once, in the order it first shows up. */
export const buildTotals = (
  rows: IStockOutRecipeForm[],
  recipes: ReadonlyMap<string, IRecipeOption>,
  extras: IStockOutLineForm[],
): IStockOutTotalRow[] => {
  const totals = new Map<string, IStockOutTotalRow>();
  const rowOf = (product: IStockLineProduct) => {
    let row = totals.get(product.uuid);
    if (!row) {
      row = { product, needed: 0, extra: 0, prefill: 0 };
      totals.set(product.uuid, row);
    }
    return row;
  };

  for (const row of rows) {
    const recipe = recipes.get(row.recipeUuid);
    if (!recipe || !row.persons) continue;
    for (const line of recipe.lines) {
      const total = rowOf(line.product);
      total.needed = round(total.needed + neededQuantity(line.quantity, row.persons), RECIPE_QUANTITY_DECIMALS);
    }
  }
  for (const line of extras) {
    if (!line.product || !line.quantity) continue;
    const total = rowOf(line.product);
    total.extra = round(total.extra + line.quantity, QUANTITY_DECIMALS);
  }

  return [...totals.values()].map((row) => ({ ...row, prefill: roundUpTotal(row.needed + row.extra, row.product) }));
};
