import type { IRecipeOption, IStockOutDetails } from 'armstock-shared';
import type { IStockOutLineForm } from '../interfaces/IStockOutLineForm';
import type { IStockOutPanelGroup } from '../interfaces/IStockOutPanelGroup';
import type { IStockOutRecipeForm } from '../interfaces/IStockOutRecipeForm';
import { neededQuantity } from './stockOutTotals';

/** The form's recipe rows (picked, with persons) and its filled extras, as summary groups. */
export const formPanelGroups = (
  rows: IStockOutRecipeForm[],
  recipes: ReadonlyMap<string, IRecipeOption>,
  extras: IStockOutLineForm[],
  extrasName: string,
): IStockOutPanelGroup[] => {
  const groups: IStockOutPanelGroup[] = [];
  for (const row of rows) {
    const recipe = recipes.get(row.recipeUuid);
    if (!recipe || !row.persons) continue;
    groups.push({
      key: `recipe-${row.key}`,
      name: recipe.name,
      persons: row.persons,
      lines: recipe.lines.map((line) => ({ key: line.uuid, product: line.product, quantity: neededQuantity(line.quantity, row.persons!) })),
    });
  }
  const extraLines = extras
    .filter((line) => line.product && line.quantity)
    .map((line) => ({ key: String(line.key), product: line.product!, quantity: line.quantity! }));
  if (extraLines.length) groups.push({ key: 'extras', name: extrasName, lines: extraLines });
  return groups;
};

/** A saved document's recipe rows (their saved copy) and extra parts, as summary groups. */
export const docPanelGroups = (doc: IStockOutDetails, extrasName: string): IStockOutPanelGroup[] => {
  const groups: IStockOutPanelGroup[] = doc.recipes.map((row) => ({
    key: row.uuid,
    name: row.recipe.name,
    persons: row.persons,
    lines: row.lines.map((line) => ({ key: line.uuid, product: line.product, quantity: line.neededQuantity })),
  }));
  const extraLines = doc.lines
    .filter((line) => line.extraQuantity > 0)
    .map((line) => ({ key: line.uuid, product: line.product, quantity: line.extraQuantity }));
  if (extraLines.length) groups.push({ key: 'extras', name: extrasName, lines: extraLines });
  return groups;
};
