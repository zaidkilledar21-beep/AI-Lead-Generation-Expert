import { useState, useCallback } from "react";

export function useLeadSelection(items: any[], itemKey = "id") {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      // Filter out items that don't have the key just in case
      const validItems = items.filter(item => item[itemKey] != null);
      if (prev.size === validItems.length && validItems.length > 0) {
        return new Set();
      }
      return new Set(validItems.map((item) => String(item[itemKey])));
    });
  }, [items, itemKey]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);
  const validItemsCount = items.filter(item => item[itemKey] != null).length;
  const isAllSelected = validItemsCount > 0 && selectedIds.size === validItemsCount;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < validItemsCount;

  return {
    selectedIds,
    selectedArray: Array.from(selectedIds),
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isSomeSelected,
    count: selectedIds.size,
  };
}
