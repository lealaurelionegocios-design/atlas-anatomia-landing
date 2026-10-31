import { expect, type Page } from "@playwright/test";

export const SHOTS = "docs/screenshots";

export function uniqueEmail(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.test`;
}

/** Signs up a new user and completes onboarding steps 1–4 (business creation). */
export async function signUpAndCreateBusiness(page: Page, opts: { market: "US" | "UK"; business: string; email?: string }) {
  const email = opts.email ?? uniqueEmail(opts.market.toLowerCase());
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Correct-horse-42");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  await expect(page.getByRole("heading", { name: "Welcome to CleanFlow" })).toBeVisible();
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByText(opts.market === "US" ? "United States" : "United Kingdom", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Business name").fill(opts.business);
  await page.getByLabel("Your name").fill(opts.market === "US" ? "Dana Rivera" : "Sophie Clarke");
  await page.getByLabel("Phone").fill(opts.market === "US" ? "(555) 010-0000" : "07700 900000");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/Hourly .* cost/).fill("20");
  await page.getByLabel("Target gross margin (%)").fill("35");
  await page.getByRole("button", { name: "Create my business" }).click();
  await expect(page.getByRole("heading", { name: "Add your first client" })).toBeVisible();
  return email;
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "page should not scroll horizontally").toBeLessThanOrEqual(1);
}
