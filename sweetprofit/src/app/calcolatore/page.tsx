import type { Metadata } from "next";
import { Suspense } from "react";
import { CalculatorPage } from "@/features/calculator/CalculatorPage";

export const metadata: Metadata = { title: "Calcolatore prezzi" };
export default function Page() {
  return (
    <Suspense>
      <CalculatorPage />
    </Suspense>
  );
}
