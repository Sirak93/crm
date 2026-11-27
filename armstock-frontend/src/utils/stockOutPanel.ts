import type { IRecipeOption, IStockOutDetails } from 'armstock-shared';
import type { IStockOutPanelGroup } from '../interfaces/IStockOutPanelGroup';
import type { IStockOutRecipeForm } from '../interfaces/IStockOutRecipeForm';
import { neededQuantity } from './stockOutTotals';

/** The form's recipe rows (picked, with persons) and the extra parts of its totals, as summary groups. */
export const formPanelGroups = (
  rows: IStockOutRecipeForm[],
  recipes: ReadonlyMap<string, IRecipeOption>,
  extraLines: IStockOutPanelGroup['lines'],
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
