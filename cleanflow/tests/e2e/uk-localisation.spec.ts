import { expect, test } from "@playwright/test";
import { SHOTS, signUpAndCreateBusiness } from "./helpers";

test("UK: GBP, DD/MM/YYYY, Quote terminology, End of Tenancy, A4 PDFs", async ({ page }) => {
  await signUpAndCreateBusiness(page, { market: "UK", business: "Brightside Cleaning Ltd" });
  await page.getByLabel("Client name").fill("Olivia Hughes");
  await page.getByLabel("Postcode").fill("BS6 5AB");
  await page.getByLabel("County").fill("Avon");
  await page.getByRole("button", { name: "Save client and continue" }).click();
  await expect(page.getByRole("heading", { name: "Create your first quote" })).toBeVisible();
  await page.getByRole("button", { name: "Go to my dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("United Kingdom · GBP").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Quotes" })).toBeVisible();

  await page.goto("/pricing");
  await page.getByLabel("Client", { exact: true }).selectOption({ label: "Olivia Hughes" });
  const types = await page.getByLabel("Service type").locator("option").allTextContents();
  expect(types).toContain("End of Tenancy Cleaning");
  expect(types).not.toContain("Move-In / Move-Out Cleaning");
  await page.getByLabel("Service type").selectOption("end_of_tenancy");
  await page.getByLabel("Labour cost per hour").fill("15");
  await page.getByLabel("Estimated hours (per cleaner)").fill("5");
  await expect(page.getByTestId("final-price")).toHaveText("£115.38"); // 75 / 0.65
  await page.getByRole("button", { name: "Save as quote" }).click();
  await expect(page.getByRole("heading", { name: /Quote QUO-0001/ })).toBeVisible();
  const issued = await page.getByText(/→/).first().textContent();
  expect(issued).toMatch(/\d{2}\/\d{2}\/\d{4} → \d{2}\/\d{2}\/\d{4}/);

  const id = page.url().split("/").pop()!;
  const pdf = (await (await page.request.get(`/api/pdf/quote/${id}`)).body()).toString("latin1");
  expect(pdf).toMatch(/\/MediaBox \[0 0 595\.2\d* 841\.8\d*\]/);

  await page.getByRole("button", { name: "Mark accepted" }).click();
  await page.getByRole("button", { name: "Book as job" }).click();
  await expect(page.getByRole("dialog").getByLabel("Checklist")).toHaveValue("end-of-tenancy-checklist");
  await page.getByRole("dialog").getByRole("button", { name: "Book job" }).click();
  await expect(page.getByText("End of Tenancy Cleaning Checklist")).toBeVisible();
  await expect(page.getByText("Compare against the inventory / check-in report if provided")).toBeVisible();
  await page.getByRole("button", { name: /Mark cancelled/ }).click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();

  await page.goto("/documents");
  await expect(page.getByRole("link", { name: /End of Tenancy Cleaning Checklist/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Move-In \/ Move-Out/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Cleaning Quote/ })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/09-document-kit-uk.png`, fullPage: true });
  const kitPdf = (await (await page.request.get("/api/pdf/document/end-of-tenancy-checklist")).body()).toString("latin1");
  expect(kitPdf.startsWith("%PDF")).toBe(true);
  expect(kitPdf).toMatch(/\/MediaBox \[0 0 595\.2\d* 841\.8\d*\]/);
});
