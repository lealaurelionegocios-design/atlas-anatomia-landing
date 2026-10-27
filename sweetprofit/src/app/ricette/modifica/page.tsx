import type { Metadata } from "next";
import { Suspense } from "react";
import { RecipeEditor } from "@/features/recipes/RecipeEditor";

export const metadata: Metadata = { title: "Ricetta" };
export default function Page() {
  return (
    <Suspense>
      <RecipeEditor />
    </Suspense>
  );
}
