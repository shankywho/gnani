import { test, expect, Page } from "@playwright/test";

/**
 * Full correction loop (FR5/FR6): submit → supervisor returns with reason → worker reopens,
 * re-confirms and resubmits → supervisor approves the new version. Johny, J5.
 * The worker reaches the returned visit by URL: there is no worker visit list yet (needs an API from Shanky).
 */
async function signIn(page: Page, who: string) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: `Sign in as ${who}` }).click();
}

test("return → reopen → re-confirm → resubmit → approve", async ({ browser }) => {
  const worker = await (await browser.newContext({ permissions: ["microphone"] })).newPage();
  const supervisor = await (await browser.newContext()).newPage();

  // Worker types the values by hand (no voice) and submits version 1... then 2 after the save.
  await signIn(worker, "Worker A");
  await worker.getByRole("button", { name: "Select Pooja Devi (SYN-0003)" }).click();
  await worker.getByRole("button", { name: "Start visit for Pooja Devi" }).click();
  await worker.getByLabel("Hemoglobin", { exact: true }).selectOption("recorded");
  await worker.getByLabel("Hemoglobin value").fill("11");
  await worker.getByRole("button", { name: "Save changes" }).click();
  await worker.getByRole("button", { name: "Confirm" }).click();
  await worker.getByRole("button", { name: "Submit" }).click();
  await expect(worker.getByText("Visit submitted successfully")).toBeVisible();
  const visitUrl = worker.url();
  const visitId = visitUrl.split("/").pop()!;

  // Supervisor returns it with a reason.
  await signIn(supervisor, "Supervisor A");
  await supervisor.goto(`/review/${visitId}`);
  await expect(supervisor.getByText("Submitted revision snapshot, version 2")).toBeVisible();
  await supervisor.getByRole("button", { name: "Return" }).click();
  await supervisor.getByPlaceholder("Reason for return").fill("Please recheck hemoglobin");
  await supervisor.getByRole("button", { name: "Confirm return" }).click();
  await expect(supervisor.getByText("Visit returned to worker")).toBeVisible();

  // Worker reopens as a new draft version, corrects, confirms again and resubmits.
  await worker.goto(visitUrl);
  await expect(worker.getByText("Returned by your supervisor")).toBeVisible();
  await worker.getByRole("button", { name: "Reopen to correct" }).click();
  await expect(worker.getByText("Version 3.")).toBeVisible();
  await worker.getByLabel("Hemoglobin value").fill("11.5");
  await worker.getByRole("button", { name: "Save changes" }).click();
  await expect(worker.getByText("Version 4.")).toBeVisible();
  await worker.getByRole("button", { name: "Confirm" }).click();
  await worker.getByRole("button", { name: "Submit" }).click();
  await expect(worker.getByText("Visit submitted successfully")).toBeVisible();

  // Supervisor approves exactly the resubmitted version; the worker then sees it as final.
  await supervisor.goto(`/review/${visitId}`);
  await expect(supervisor.getByText("11.5 g/dL")).toBeVisible();
  await supervisor.getByRole("button", { name: "Approve version 4" }).click();
  await expect(supervisor.getByText("Visit approved")).toBeVisible();

  await worker.reload();
  await expect(worker.getByText("Approved by your supervisor")).toBeVisible();
});
