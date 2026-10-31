import { expect, test } from "@playwright/test";
import { SHOTS, signUpAndCreateBusiness } from "./helpers";

// The core journey from the product brief, in the US market:
// client → calculator → quote → accept → job → checklist → complete →
// invoice → payment → dashboard updates. Plus PDF and CSV exports.

test("US: full flow from first client to payment updates the dashboard", async ({ page }) => {
  await signUpAndCreateBusiness(page, { market: "US", business: "Sparkle Homes LLC" });
  await page.screenshot({ path: `${SHOTS}/01-onboarding-first-client.png`, fullPage: true });

  // Step 5: first client
  await page.getByLabel("Client name").fill("Jordan Smith");
  await page.getByLabel("Email").fill("jordan@example.test");
  await page.getByLabel("Address line 1").fill("1428 Elm Street");
  await page.getByLabel("City / town").fill("Austin");
  await page.getByLabel("State").fill("TX");
  await page.getByLabel("ZIP code").fill("78701");
  await page.getByRole("button", { name: "Save client and continue" }).click();

  // Step 6: first estimate → pricing calculator with the client preselected
  await expect(page.getByRole("heading", { name: "Create your first estimate" })).toBeVisible();
  await page.getByRole("button", { name: "Open the pricing calculator" }).click();
  await expect(page).toHaveURL(/\/pricing\?clientId=/);
  await expect(page.getByLabel("Client", { exact: true })).toHaveValue(/[0-9a-f-]{36}/);

  await page.getByLabel("Service type").selectOption("deep");
  await page.getByLabel("Estimated hours (per cleaner)").fill("3");
  await page.getByLabel("Number of cleaners").fill("2");
  await page.getByLabel("Labor cost per hour").fill("20");
  await page.getByLabel("Products & supplies").fill("8");
  await page.getByLabel("Travel").fill("6");
  await page.getByLabel("Target gross margin").fill("35");
  await expect(page.getByTestId("total-costs")).toHaveText("$134.00");
  await expect(page.getByTestId("final-price")).toHaveText("$206.15");
  await page.screenshot({ path: `${SHOTS}/02-pricing-calculator.png`, fullPage: true });

  // Manual adjustment, then back to the suggestion
  await page.getByLabel("Manual price (optional)").fill("100");
  await expect(page.getByText("The manual price is below your estimated costs")).toBeVisible();
  await page.getByLabel("Manual price (optional)").fill("");
  await expect(page.getByTestId("final-price")).toHaveText("$206.15");

  await page.getByRole("button", { name: "Save as estimate" }).click();
  await expect(page).toHaveURL(/\/quotes\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /Estimate EST-0001/ })).toBeVisible();
  await expect(page.getByTestId("quote-total")).toHaveText("$206.15");

  // Edit → version 2 with an extra line
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Add line" }).click();
  await page.getByLabel("Description, line 2").fill("Inside oven");
  await page.locator('input[name="items.1.unit_price"]').fill("35");
  await expect(page.getByTestId("items-total")).toHaveText("$241.15");
  await page.getByRole("button", { name: "Save new version" }).click();
  await expect(page.getByText("Version 2 ·")).toBeVisible();
  await expect(page.getByTestId("quote-total")).toHaveText("$241.15");

  // PDF of the estimate: US Letter
  const quoteUrl = page.url();
  const quoteId = quoteUrl.split("/").pop()!;
  const quotePdf = await page.request.get(`/api/pdf/quote/${quoteId}`);
  expect(quotePdf.status()).toBe(200);
  expect(quotePdf.headers()["content-type"]).toBe("application/pdf");
  const qBody = (await quotePdf.body()).toString("latin1");
  expect(qBody.startsWith("%PDF")).toBe(true);
  expect(qBody).toMatch(/\/MediaBox \[0 0 612 792\]/);

  // Sent → Accepted → Book as job
  await page.getByRole("button", { name: "Mark as sent" }).click();
  await expect(page.getByText("Sent", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mark accepted" }).click();
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/03-estimate-accepted.png`, fullPage: true });
  await page.getByRole("button", { name: "Book as job" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Date").fill("2030-05-14");
  await dialog.getByLabel("Start time").fill("09:30");
  await expect(dialog.getByLabel("Checklist")).toHaveValue("deep-cleaning-checklist");
  await dialog.getByRole("button", { name: "Book job" }).click();

  // Job page with checklist
  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /Jordan Smith/ })).toBeVisible();
  await expect(page.getByText("Scheduled", { exact: true })).toBeVisible();
  const boxes = page.getByRole("checkbox");
  expect(await boxes.count()).toBeGreaterThan(15);
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await expect(page.getByText(/^2 of \d+ done$/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/04-job-checklist.png`, fullPage: true });
  await page.reload();
  await expect(page.getByText(/^2 of \d+ done$/)).toBeVisible(); // persisted

  // The quote is now locked and links to the job
  await page.goto(quoteUrl);
  await expect(page.getByText("Booked as a job on 05/14/2030")).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to draft" })).toHaveCount(0);
  await page.getByRole("link", { name: "Open the job" }).click();

  // Complete → invoice
  await page.getByRole("button", { name: "Mark completed" }).click();
  await expect(page.getByText("This job is complete")).toBeVisible();
  await page.getByRole("button", { name: "Create invoice" }).first().click();
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /Invoice INV-0001/ })).toBeVisible();
  await expect(page.getByText("Unpaid", { exact: true })).toBeVisible();
  await expect(page.getByTestId("invoice-balance")).toHaveText("$241.15");

  // Partial payment, overpayment rejected, then the rest
  await page.getByRole("button", { name: "Record payment" }).click();
  let pay = page.getByRole("dialog");
  await pay.getByLabel("Amount received").fill("100");
  await pay.getByLabel("Method").selectOption("check");
  await pay.getByRole("button", { name: "Save payment" }).click();
  await expect(page.getByText("Partially Paid", { exact: true })).toBeVisible();
  await expect(page.getByTestId("invoice-balance")).toHaveText("$141.15");

  await page.getByRole("button", { name: "Record payment" }).click();
  pay = page.getByRole("dialog");
  await pay.getByLabel("Amount received").fill("500");
  await pay.getByRole("button", { name: "Save payment" }).click();
  await expect(page.getByText(/exceeds the outstanding balance/)).toBeVisible();
  await pay.getByLabel("Amount received").fill("141.15");
  await pay.getByRole("button", { name: "Save payment" }).click();
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();
  await expect(page.getByTestId("invoice-balance")).toHaveText("$0.00");
  await page.screenshot({ path: `${SHOTS}/05-invoice-paid.png`, fullPage: true });

  const invoiceId = page.url().split("/").pop()!;
  const invPdf = await page.request.get(`/api/pdf/invoice/${invoiceId}`);
  expect(invPdf.status()).toBe(200);
  expect((await invPdf.body()).toString("latin1").startsWith("%PDF")).toBe(true);

  // An expense, then the dashboard (all time, since the job is in the future)
  await page.goto("/payments");
  await page.getByRole("button", { name: "Add expense" }).click();
  const exp = page.getByRole("dialog");
  await exp.getByLabel("Description").fill("Microfiber cloths");
  await exp.getByLabel(/Amount/).fill("41.15");
  await exp.getByRole("button", { name: "Save expense" }).click();
  await expect(page.getByText("Expense added")).toBeVisible();

  await page.goto("/dashboard?period=all_time");
  await expect(page.getByTestId("metric-received")).toHaveText("$241.15");
  await expect(page.getByTestId("metric-outstanding")).toHaveText("$0.00");
  await expect(page.getByTestId("metric-surplus")).toHaveText("$200.00");
  await expect(page.getByText("An estimate, not accounting profit.")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/06-dashboard.png`, fullPage: true });

  // CSV export
  const csv = await page.request.get("/api/export/payments");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const text = await csv.text();
  expect(text).toContain("INV-0001");
  expect(text).toContain("141.15");
  expect(text).toContain("Check");

  const json = await page.request.get("/api/export/all");
  const data = await json.json();
  expect(data.format).toBe("cleanflow-export-v1");
  expect(data.clients).toHaveLength(1);
  expect(data.payments).toHaveLength(2);

  // Client history shows everything linked by the same client id
  await page.goto("/clients");
  await page.getByRole("link", { name: "Jordan Smith" }).click();
  await expect(page.getByRole("link", { name: /EST-0001/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /INV-0001/ })).toBeVisible();
  await expect(page.getByText("Payments received (2)")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/07-client-history.png`, fullPage: true });

  // Calendar view
  await page.goto("/jobs?view=calendar&month=2030-05");
  await expect(page.getByRole("heading", { name: "May 2030" })).toBeVisible();
  await expect(page.getByRole("link", { name: /9:30 AM Jordan Smith/ })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/08-jobs-calendar.png`, fullPage: true });
});
