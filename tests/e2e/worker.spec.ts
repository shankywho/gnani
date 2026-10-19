import { test, expect } from "@playwright/test";

/**
 * End-to-End specification for Worker Journey per DESIGN.md and SAKHILINE_BUILD.md §14.
 * Marked test.skip until Johny's UI routes in apps/web are implemented.
 * Real backend contracts and lifecycle are validated in tests/integration/extractions.integration.test.ts (Integration #9).
 */
test.describe("Worker Journey E2E Flow", () => {
  test.skip(true, "awaiting Johny's UI");

  test("select beneficiary -> acquire context -> voice extraction -> confirm -> submit", async ({ page }) => {
    // 1. Sign in as Worker A
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Sign In as Worker A" }).click();
    await expect(page).toHaveURL("/visits/new");

    // 2. Select assigned beneficiary from roster
    await page.getByPlaceholder("Search beneficiary").fill("Sunita");
    await page.getByRole("button", { name: "Select Sunita (SYN-0001)" }).click();

    // 3. Verify prior history displayed with 'previous visit' label and not prepopulated
    await expect(page.getByText("Previous Visit")).toBeVisible();
    await expect(page.getByLabel("Blood Pressure Systolic")).toBeEmpty();

    // 4. Record audio clip
    const recordBtn = page.getByRole("button", { name: "Record" });
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "Stop" }).click();

    // 5. Extraction proposal review
    await expect(page.getByText("Proposal Extracted")).toBeVisible();
    await page.getByRole("button", { name: "Accept Proposed Values" }).click();

    // 6. Confirm visit snapshot
    const confirmBtn = page.getByRole("button", { name: "Confirm" });
    await confirmBtn.click();
    await expect(page.getByText("Confirmed Snapshot")).toBeVisible();

    // 7. Distinct submit action
    const submitBtn = page.getByRole("button", { name: "Submit" });
    await submitBtn.click();

    // 8. Durable receipt
    await expect(page.getByText("Visit Submitted Successfully")).toBeVisible();
  });
});
