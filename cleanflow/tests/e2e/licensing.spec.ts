import { expect, test } from "@playwright/test";
import { adminClient } from "../support/supabase";
import { signUpAndCreateBusiness, uniqueEmail } from "./helpers";

// Runs only against a server started with CLEANFLOW_REQUIRE_LICENSE=true:
//   CLEANFLOW_REQUIRE_LICENSE=true npx next start -p 3002
//   E2E_LICENSE_URL=http://localhost:3002 npx playwright test licensing
const base = process.env.E2E_LICENSE_URL;
test.skip(!base, "Set E2E_LICENSE_URL to a server running with CLEANFLOW_REQUIRE_LICENSE=true");
test.use({ baseURL: base });

test("licence gate: blocked → granted → activated → refunded → blocked", async ({ page }) => {
  const email = uniqueEmail("buyer");
  await signUpAndCreateBusiness(page, { market: "US", business: "Licensed Co", email });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/license$/);
  await page.getByRole("button", { name: "Check my licence" }).click();
  await expect(page.getByText("No active licence found for this email yet.")).toBeVisible();
  expect((await page.request.get("/api/export/all")).status()).toBe(403);

  const admin = adminClient();
  const ref = `e2e-${Date.now()}`;
  await admin.from("licenses").insert({ email: email.toLowerCase(), external_ref: ref, source: "e2e", status: "active" });
  await page.getByRole("button", { name: "Check my licence" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Business Overview" })).toBeVisible();

  await admin.from("licenses").update({ status: "refunded", revoked_at: new Date().toISOString() }).eq("external_ref", ref);
  await page.goto("/clients");
  await expect(page).toHaveURL(/\/license$/);
});
