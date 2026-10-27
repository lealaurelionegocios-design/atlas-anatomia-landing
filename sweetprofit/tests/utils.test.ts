import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/utils/csv";
import { centsToInput, parseEuroToCents, parseLocaleNumber } from "@/lib/utils/parse";
import { formatEUR, formatPercent, formatUnitCost } from "@/lib/i18n/format";
import { dec } from "@/lib/calc/decimal";

describe("lettura numeri", () => {
  it("accetta virgola o punto decimale", () => {
    expect(parseLocaleNumber("1,80")).toBe(1.8);
    expect(parseLocaleNumber("1.80")).toBe(1.8);
    expect(parseLocaleNumber("1.234,5")).toBe(1234.5);
    expect(parseLocaleNumber(" € 12 ")).toBe(12);
    expect(parseLocaleNumber("")).toBeNull();
    expect(parseLocaleNumber("abc")).toBeNull();
    expect(parseLocaleNumber("-3")).toBe(-3);
  });

  it("euro → centesimi senza errori di arrotondamento", () => {
    expect(parseEuroToCents("1,80")).toBe(180);
    expect(parseEuroToCents("0,29")).toBe(29); // 0.29*100 = 28.999… in virgola mobile
    expect(parseEuroToCents("1,005")).toBe(101);
    expect(centsToInput(180)).toBe("1,80");
  });
});

describe("formattazione italiana", () => {
  const norm = (s: string) => s.replace(/ | /g, " ");
  it("valuta, percentuali e costi unitari", () => {
    expect(norm(formatEUR(dec("12345.5")))).toBe("12.345,50 €"); // in italiano 4 cifre non si raggruppano
    expect(norm(formatEUR(dec("2.505")))).toBe("2,51 €");
    expect(formatPercent(dec("44.2342"))).toBe("44,2%");
    expect(norm(formatUnitCost(dec("0.0018"), "g"))).toBe("0,0018 €/g");
  });
});

describe("CSV", () => {
  it("separatore ; con escape e BOM", () => {
    const csv = toCsv(["Nome", "Costo"], [["Torta; \"speciale\"", "2,51"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1)).toBe('Nome;Costo\r\n"Torta; ""speciale""";2,51');
  });
});
