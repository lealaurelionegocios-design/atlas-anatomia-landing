/**
 * Palette categoriale per le voci di costo (ordine fisso, verificata per
 * daltonismo e contrasto con lo strumento di validazione dataviz).
 */
export const COST_COLORS = {
  ingredients: "#A3324F",
  waste: "#C9772F",
  labor: "#5C6FC4",
  packaging: "#3A8A5A",
  other: "#B9639A",
  fixed: "#8A7F86",
} as const;

export const SERIES = { primary: "#842A42", secondary: "#5C6FC4" } as const;

export const AXIS = { tick: "#6E5F65", grid: "#EADDD6" } as const;
