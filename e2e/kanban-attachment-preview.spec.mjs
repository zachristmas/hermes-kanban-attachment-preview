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

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("kap-modal")).toHaveCount(0);
  await expect(page.locator(".hermes-kanban-drawer")).toBeVisible(); // Esc closed only the preview
});

test("word document (.docx) renders as formatted text, not raw bytes", async ({ page }) => {
  // Needs report.docx (real Word markup: Heading1/2 styles, hyperlink, numbering, merged table cell,
  // tracked delete+insert, a literal <script> string) seeded as an attachment. See README: Testing.
  await openDrawer(page);
  await page.getByTestId("kap-open").first().click();
  const doc = page.getByTestId("kap-docx");
  for (let i = 0; i < 10; i++) {
    if ((await page.locator(".kap-title").innerText()) === "report.docx" && (await doc.count())) break;
    if (await page.getByTestId("kap-next").isDisabled()) break;
    await page.getByTestId("kap-next").click();
    await page.waitForTimeout(250);
  }
  await expect(page.locator(".kap-title")).toHaveText("report.docx");
  await expect(doc).toBeVisible();
  await expect(doc.locator("h1")).toHaveText("Quarterly Plan");
  await expect(doc.locator("h2")).toHaveText("Steps");
  await expect(doc.locator("strong")).toHaveText("bold");
  await expect(doc.locator("a")).toHaveAttribute("href", "https://example.com/x");
  await expect(doc.locator("ol > li")).toHaveCount(2);
  await expect(doc.locator("ol > li ul li")).toHaveText("nested bullet");
  await expect(doc.locator("td").first()).toHaveAttribute("colspan", "2");
  await expect(doc).toContainText("inserted text");
  await expect(doc).not.toContainText("removed text");
  await expect(doc).toContainText("<script>alert(1)</script>");
  expect(await doc.locator("script").count()).toBe(0);
});

test("textutil/Pages-style docx (direct formatting) still shows its text", async ({ page }) => {
  await openDrawer(page);
  await page.getByTestId("kap-open").first().click();
  for (let i = 0; i < 10; i++) {
    if ((await page.locator(".kap-title").innerText()) === "plan.docx") break;
    await page.getByTestId("kap-next").click();
    await page.waitForTimeout(250);
  }
  await expect(page.getByTestId("kap-docx")).toContainText("Quarterly Plan");
  await expect(page.getByTestId("kap-docx")).toContainText("Owner"); // textutil flattens tables to paragraphs
});
