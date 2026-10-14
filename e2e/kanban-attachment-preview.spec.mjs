import { test, expect } from "@playwright/test";

const TASK = process.env.KANBAN_E2E_TASK; // seeded task id with comments first/second/third + 4 attachments

test.skip(!TASK, "set KANBAN_E2E_TASK to the seeded sandbox task id");

async function openDrawer(page) {
  await page.goto("/kanban");
  await page.locator(`[data-task-id="${TASK}"]`).first().click();
  await expect(page.locator(".hermes-kanban-drawer")).toBeVisible();
}

test("attachment preview: image, text, pdf, unsupported, Esc keeps drawer", async ({ page }) => {
  await openDrawer(page);
  await page.getByTestId("kap-open").first().click();
  await expect(page.getByTestId("kap-modal")).toBeVisible();

  const img = page.getByTestId("kap-image");
  await expect(img).toBeVisible();
  expect(await img.evaluate((i) => i.naturalWidth)).toBe(64);

  await page.getByTestId("kap-next").click();
  await expect(page.getByTestId("kap-text")).toContainText("hello preview");

  await page.getByTestId("kap-next").click();
  await expect(page.getByTestId("kap-pdf")).toBeVisible();

  await page.getByTestId("kap-next").click();
  await expect(page.getByTestId("kap-body")).toContainText("No preview for this file type");
  await expect(page.getByTestId("kap-next")).toBeDisabled();

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("kap-modal")).toHaveCount(0);
  await expect(page.locator(".hermes-kanban-drawer")).toBeVisible(); // Esc closed only the preview
});
