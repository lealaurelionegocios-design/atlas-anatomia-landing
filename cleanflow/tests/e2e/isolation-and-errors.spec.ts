import { expect, test } from "@playwright/test";
import { signUpAndCreateBusiness } from "./helpers";

test("accounts are isolated in the UI and API", async ({ browser }) => {
  const a = await browser.newContext();
  const pa = await a.newPage();
  await signUpAndCreateBusiness(pa, { market: "US", business: "Alpha Cleaning" });
  await pa.getByLabel("Client name").fill("Secret Client");
  await pa.getByRole("button", { name: "Save client and continue" }).click();
  await pa.getByRole("button", { name: "Go to my dashboard" }).click();
  await pa.goto("/clients");
  await pa.getByRole("link", { name: "Secret Client" }).click();
  await pa.waitForURL(/\/clients\/[0-9a-f-]{36}$/);
  const clientUrl = new URL(pa.url()).pathname;
  await pa.goto("/quotes/new");
  await pa.locator("#client_id").selectOption({ label: "Secret Client" });
  await pa.locator('input[name="items.0.unit_price"]').fill("99");
  await pa.getByRole("button", { name: "Save estimate" }).click();
  await expect(pa.getByRole("heading", { name: /EST-0001/ })).toBeVisible();
  const quoteId = pa.url().split("/").pop()!;

  const b = await browser.newContext();
  const pb = await b.newPage();
  await signUpAndCreateBusiness(pb, { market: "US", business: "Beta Cleaning" });
  await pb.goto(clientUrl);
  await expect(pb.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  await pb.goto(`/quotes/${quoteId}`);
  await expect(pb.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  expect((await pb.request.get(`/api/pdf/quote/${quoteId}`)).status()).toBe(404);
  await pb.goto("/clients");
  await expect(pb.getByText("Secret Client")).toHaveCount(0);
  const exp = await (await pb.request.get("/api/export/all")).json();
  expect(exp.clients).toEqual([]);
  expect(exp.quotes).toEqual([]);

  // Signed-out access
  const c = await browser.newContext();
  const pc = await c.newPage();
  await pc.goto("/clients");
  await expect(pc).toHaveURL(/\/login\?next=%2Fclients/);
  expect((await pc.request.get("/api/export/clients")).status()).toBe(401);
  await Promise.all([a.close(), b.close(), c.close()]);
});

test("validation and error states are shown to the user", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.test");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Incorrect email or password.")).toBeVisible();

  await page.goto("/signup");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();

  await signUpAndCreateBusiness(page, { market: "US", business: "Errors Inc" });
  await page.getByRole("button", { name: "Save client and continue" }).click();
  await expect(page.getByText("Client name is required.")).toBeVisible();
  await page.getByLabel("Client name").fill("Casey");
  await page.getByLabel("Email").fill("bad@");
  await page.getByRole("button", { name: "Save client and continue" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByRole("button", { name: "Go to my dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Let's get your first job in" })).toBeVisible();

  // Calculator: invalid margin and missing client
  await page.goto("/pricing");
  await page.getByLabel("Target gross margin").fill("100");
  await expect(page.getByText("Fix the highlighted values to see a price.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save as estimate" })).toBeDisabled();
  await page.getByLabel("Target gross margin").fill("30");
  await page.getByRole("button", { name: "Save as estimate" }).click();
  await expect(page.getByText("Choose a client to save this price.").first()).toBeVisible();

  // Empty states
  for (const [path, text] of [
    ["/clients", "No clients yet"],
    ["/quotes", "No estimates yet"],
    ["/jobs", "No jobs booked yet"],
    ["/invoices", "No invoices yet"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByText(text)).toBeVisible();
  }

  // Unknown pages
  await page.goto("/quotes/00000000-0000-0000-0000-000000000000");
  await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  await page.goto("/documents/does-not-exist");
  await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
});
