import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signUpAndCreateBusiness } from "./helpers";

// Automated WCAG 2.1 A/AA checks (axe-core) on the main screens, with demo data loaded.
test("main screens have no serious or critical accessibility violations", async ({ page }) => {
  await signUpAndCreateBusiness(page, { market: "US", business: "A11y Cleaning" });
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByRole("button", { name: "Load demo data" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  const results: Record<string, string[]> = {};
  for (const path of ["/dashboard", "/clients", "/clients/new", "/pricing", "/quotes", "/quotes/new", "/jobs", "/jobs?view=calendar", "/jobs/new", "/invoices", "/payments", "/documents", "/documents/booking-confirmation", "/settings", "/settings/data"]) {
    await page.goto(path);
    await page.locator("main h1").first().waitFor();
    const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = scan.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    if (serious.length) results[path] = serious.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  }
  expect(results).toEqual({});
});

test("public pages are accessible", async ({ page }) => {
  for (const path of ["/", "/login", "/signup", "/privacy"]) {
    await page.goto(path);
    const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(scan.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${path} ${v.id}`)).toEqual([]);
  }
});
