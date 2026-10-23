import { test, expect, Page, Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Automated accessibility scan (Johny, J7). Fails on serious/critical axe violations only.
// Not a compliance claim: keyboard, screen reader and zoom are still checked by hand (docs/qa/device-a11y.md).
async function expectNoSeriousViolations(page: Page, name: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${name}: ${v.id} (${v.nodes.length}) ${v.help}`)).toEqual([]);
}

test("worker and public screens", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: "Sign in as Worker A" })).toBeVisible();
  await expectNoSeriousViolations(page, "sign-in");

  await page.goto("/evaluation");
  await expect(page.getByRole("heading", { name: "Synthetic robustness evaluation" })).toBeVisible();
  await expectNoSeriousViolations(page, "evaluation");

  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Sign in as Worker A" }).click();
  await expect(page.getByPlaceholder("Search beneficiary")).toBeVisible();
  await expectNoSeriousViolations(page, "new-visit roster");

  await page.getByRole("button", { name: "Select Anita Sharma (SYN-0004)" }).click();
  await expect(page.getByText("Previous visits")).toBeVisible();
  await expectNoSeriousViolations(page, "new-visit history");

  await page.getByRole("button", { name: "Start visit for Anita Sharma" }).click();
  await expect(page.getByRole("button", { name: "Record" })).toBeVisible();
  await expectNoSeriousViolations(page, "visit draft");
});

test("supervisor queue", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Sign in as Supervisor A" }).click();
  await expect(page.getByRole("heading", { name: "Visits to review" })).toBeVisible();
  await expectNoSeriousViolations(page, "review queue");
});

test("keyboard only: sign in and choose a beneficiary without a mouse", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: "Sign in as Worker A" })).toBeVisible();
  await tabTo(page, page.getByRole("button", { name: "Sign in as Worker A" }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/visits/new");
  await tabTo(page, page.getByPlaceholder("Search beneficiary"));
  await page.keyboard.type("SYN-0003");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /Pooja Devi/ })).toBeVisible();
});

async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  for (let i = 0; i < 15; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("could not reach element with Tab");
}
