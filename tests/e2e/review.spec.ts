import { test, expect } from "@playwright/test";

/**
 * End-to-End specification for Supervisor Review Journey per DESIGN.md and SAKHILINE_BUILD.md §14.
 * Un-skipped by Johny (J5, 2026-10-24); depends on the worker project having submitted a visit.
 * Real backend concurrency and review race contracts are validated in tests/integration/reviews.integration.test.ts (Integration #7).
 */
test.describe("Supervisor Journey E2E Flow", () => {
  test("queue -> snapshot inspection -> approve / return with reason", async ({ page }) => {
    // 1. Sign in as Supervisor A
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Sign In as Supervisor A" }).click();
    await expect(page).toHaveURL("/review");

    // 2. Queue view - inspect pending records without clinical-risk ranking
    const visitRow = page.getByRole("row", { name: /Sunita/i }).first();
    await expect(visitRow).toBeVisible();
    await visitRow.click();

    // 3. Review exact submitted revision snapshot
    await expect(page).toHaveURL(/\/review\/[a-f0-9-]+/);
    await expect(page.getByText("Submitted Revision Snapshot")).toBeVisible();

    // 4. Return with reason flow
    await page.getByRole("button", { name: "Return" }).click();
    await page.getByPlaceholder("Reason for return").fill("Please verify hemoglobin units");
    await page.getByRole("button", { name: "Confirm Return" }).click();

    // 5. Returned confirmation
    await expect(page.getByText("Visit Returned to Worker")).toBeVisible();
  });
});
