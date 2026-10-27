import type { Metadata } from "next";
import { RecipesPage } from "@/features/recipes/RecipesPage";

export const metadata: Metadata = { title: "Ricette" };
export default function Page() {
  return <RecipesPage />;
}
