import { describe, expect, it } from "vitest";
import { compatibleUnits, convertQuantity } from "@/lib/calc/units";
import { expectDec } from "./helpers";

describe("conversione unità", () => {
  it("kg → g e l → ml", () => {
    const a = convertQuantity(1.5, "kg", "g");
    expect(a.ok).toBe(true);
    if (a.ok) expectDec(a.value, 1500);
    const b = convertQuantity(0.25, "l", "ml");
    if (b.ok) expectDec(b.value, 250);
  });

  it("g → kg senza errori di virgola mobile", () => {
    const r = convertQuantity(100, "g", "kg");
    if (!r.ok) throw new Error();
    expectDec(r.value, "0.1");
  });

  it("stessa unità restituisce la stessa quantità", () => {
    const r = convertQuantity(7, "pz", "pz");
    if (r.ok) expectDec(r.value, 7);
  });

  it("peso ↔ volume richiede la densità", () => {
    expect(convertQuantity(100, "ml", "g")).toEqual({ ok: false, error: "density_required" });
    const r = convertQuantity(100, "ml", "g", 1.03);
    if (!r.ok) throw new Error();
    expectDec(r.value, 103);
    const back = convertQuantity(103, "g", "ml", 1.03);
    if (!back.ok) throw new Error();
    expectDec(back.value, 100);
    const kgToL = convertQuantity(1, "kg", "l", 0.5);
    if (!kgToL.ok) throw new Error();
    expectDec(kgToL.value, 2);
  });

  it("i pezzi non sono convertibili in peso o volume", () => {
    expect(convertQuantity(1, "pz", "g", 1)).toEqual({ ok: false, error: "incompatible_units" });
    expect(convertQuantity(1, "ml", "pz")).toEqual({ ok: false, error: "incompatible_units" });
  });

  it("quantità negative rifiutate", () => {
    expect(convertQuantity(-1, "g", "kg")).toEqual({ ok: false, error: "invalid_quantity" });
  });

  it("unità compatibili dipendono dalla densità", () => {
    expect(compatibleUnits("kg", null)).toEqual(["g", "kg"]);
    expect(compatibleUnits("l", 1.03)).toEqual(["ml", "l", "g", "kg"]);
    expect(compatibleUnits("pz", 2)).toEqual(["pz"]);
  });
});
