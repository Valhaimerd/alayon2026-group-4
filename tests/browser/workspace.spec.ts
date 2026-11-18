import { test, expect } from "@playwright/test";

test("map selection, floor switching, search and daily navigation remain usable", async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/explore?date=2026-11-12");
  if (isMobile) await page.getByRole("button", { name: "Filters & rooms" }).click();
  await expect(page.getByRole("heading", { name: "Find your room." })).toBeVisible();
  await page.getByRole("button", { name: /Room G01/ }).first().click();
  await expect(page.getByRole("heading", { name: "Room G01", exact: true })).toBeVisible();
  if (isMobile) await page.getByRole("button", { name: "View schedule", exact: true }).click();
  await expect(page.getByText("Introduction to computing").first()).toBeVisible();
  if (isMobile) await page.getByRole("button", { name: "Filters & rooms" }).click();
  await page.getByRole("button", { name: "Second floor", exact: true }).click();
  await expect(page.locator(".map-room")).toHaveCount(7);
  const search = page.getByRole("searchbox", { name: "Search rooms or subjects" });
  await search.fill("no matching room");
  await expect(page.getByText(/No rooms match/)).toBeVisible();
  await search.fill("");
  await page.getByRole("button", { name: "Ground floor", exact: true }).click();
  await page.getByLabel("Date", { exact: true }).fill("2026-11-13");
  await page.getByRole("button", { name: /Room G01/ }).first().click();
  if (isMobile) await page.getByRole("button", { name: "View schedule", exact: true }).click();
  await expect(page.getByText("No classes scheduled")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("Laravel CSRF protection and legacy routes remain active", async ({ page, request }) => {
  await page.goto("/explore");
  const response = await request.post("/actions/bookings/save", { data: { room: "g1" }, headers: { Accept: "application/json" } });
  expect(response.status()).toBe(419);
  const staff = await request.get("/staff", { maxRedirects: 0 });
  expect(staff.status()).toBe(302);
  expect(staff.headers().location).toContain("/explore?signin=1");
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).start_url).toBe("/explore");
});

test("original welcome page is served", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator('a[href="/explore"]').first()).toBeAttached();
  expect(await page.title()).toMatch(/Schedflow/i);
});
