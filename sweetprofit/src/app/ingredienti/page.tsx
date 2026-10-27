import type { Metadata } from "next";
import { IngredientsPage } from "@/features/ingredients/IngredientsPage";

export const metadata: Metadata = { title: "Ingredienti" };
export default function Page() {
  return <IngredientsPage />;
}
