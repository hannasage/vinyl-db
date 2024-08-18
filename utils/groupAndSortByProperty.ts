/** Takes a 1D array of type T and transforms it to a grouped 2D array with optional
  * inner-dimension sorting by a given property. */
export function groupAndSortByProperty<T>(arr: T[], groupBy: keyof T, sortGroupsBy?: keyof T): T[][] {
  // Step 1: Group by the specified property
  const grouped = arr.reduce((acc: { [key: string]: T[] }, obj: T) => {
    const key = String(obj[groupBy]);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obj);
    return acc;
  }, {});
  // Step 2: Sort each group alphabetically by the property
  if (sortGroupsBy) {
    for (let key in grouped) {
      grouped[key].sort((a, b) => String(a[sortGroupsBy]).localeCompare(String(b[sortGroupsBy])));
    }
  }
  // Step 3: Convert the grouped object into a 2D array and sort the outer array alphabetically by the property
  return Object.keys(grouped)
    .sort((a, b) => a.localeCompare(b))
    .map(key => grouped[key]);
}