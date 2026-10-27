import type { RecipeIssue } from "../calc/recipe";
import type { Messages } from "./messages/it";

export function issueText(m: Messages, issue: RecipeIssue): string {
  const v = m.issues[issue.code];
  return typeof v === "function" ? v(issue.ingredientName) : v;
}
