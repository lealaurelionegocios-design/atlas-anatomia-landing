import { expect, test } from "@playwright/test";
import { SHOTS, noHorizontalScroll, signUpAndCreateBusiness } from "./helpers";

test("demo data loads, is flagged, and is removed without touching real data", async ({ page }) => {
  await signUpAndCreateBusiness(page, { market: "US", business: "Demo Tester" });
  await page.getByLabel("Client name").fill("Real Client");
  await page.getByRole("button", { name: "Save client and continue" }).click();
  await page.getByRole("button", { name: "Load demo data" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("You are viewing sample (demo) records")).toBeVisible();
  await expect(page.getByTestId("metric-received")).not.toHaveText("$0.00");
  await page.goto("/clients");
  await expect(page.getByText("Demo", { exact: true }).first()).toBeVisible();
  expect(await page.getByRole("link", { name: /\(Demo\)/ }).count()).toBe(4);
  await page.goto("/invoices");
  await expect(page.getByText("Overdue", { exact: true }).or(page.getByText("Unpaid", { exact: true })).first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/10-invoices-demo.png`, fullPage: true });

  await page.goto("/settings/data");
  await page.getByRole("button", { name: "Remove demo data" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove demo data" }).click();
  await expect(page.getByText("Demo data removed")).toBeVisible();
  await page.goto("/clients");
  await expect(page.getByRole("link", { name: "Real Client" })).toBeVisible();
  await expect(page.getByRole("link", { name: /\(Demo\)/ })).toHaveCount(0);
});

test("document kit: fill with a client, edit, save, PDF", async ({ page }) => {
  await signUpAndCreateBusiness(page, { market: "US", business: "Kit Co" });
  await page.getByLabel("Client name").fill("Taylor Brooks");
  await page.getByRole("button", { name: "Save client and continue" }).click();
  await page.getByRole("button", { name: "Go to my dashboard" }).click();

  await page.goto("/documents");
  for (const name of ["Client Intake Form", "Cleaning Estimate", "Service Invoice", "Booking Confirmation", "Standard Cleaning Checklist", "Deep Cleaning Checklist", "Move-In / Move-Out Cleaning Checklist", "Client Welcome Guide", "Service Scope Worksheet", "Customer Follow-Up Messages", "Review Request Messages"]) {
    await expect(page.getByRole("link", { name: new RegExp(name.replace(/[/()]/g, ".")) })).toBeVisible();
  }
  await page.getByRole("link", { name: /Customer Follow-Up Messages/ }).click();
  await page.getByLabel("Fill with client details").selectOption({ label: "Taylor Brooks" });
  await expect(page.getByText(/Hi Taylor, thank you for having us today!/)).toBeVisible();
  const slot = page.getByLabel("After the first clean");
  await slot.fill("Thanks {{client_first_name}} — see you next time! {{signature}}");
  await expect(page.getByText("Thanks Taylor — see you next time! Dana Rivera, Kit Co")).toBeVisible();
  await page.getByRole("button", { name: "Save template" }).click();
  await expect(page.getByText("Template saved for your business")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Thanks Taylor — see you next time!")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/11-document-editor.png`, fullPage: true });
  const res = await page.request.get(page.url().replace("/documents/", "/api/pdf/document/"));
  expect(res.status()).toBe(200);
  expect((await res.body()).toString("latin1")).toMatch(/\/MediaBox \[0 0 612 792\]/);
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("navigation drawer and pages fit a phone screen", async ({ page }) => {
    await signUpAndCreateBusiness(page, { market: "UK", business: "Pocket Cleaners" });
    await page.getByRole("button", { name: "Skip for now" }).click();
    await page.getByRole("button", { name: "Load demo data" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await noHorizontalScroll(page);
    await page.screenshot({ path: `${SHOTS}/12-mobile-dashboard.png`, fullPage: true });

    await page.getByRole("button", { name: "Open menu" }).click();
    const nav = page.getByRole("dialog");
    await expect(nav.getByRole("link", { name: "Jobs & Bookings" })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/13-mobile-menu.png` });
    await nav.getByRole("link", { name: "Jobs & Bookings" }).click();
    await expect(page).toHaveURL(/\/jobs/);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    for (const path of ["/clients", "/pricing", "/quotes", "/jobs?view=calendar", "/invoices", "/payments", "/documents", "/settings", "/documents/client-intake-form"]) {
      await page.goto(path);
      await expect(page.locator("main h1").first()).toBeVisible();
      await noHorizontalScroll(page);
    }
    await page.goto("/pricing");
    await page.screenshot({ path: `${SHOTS}/14-mobile-pricing.png`, fullPage: true });
  });
});
