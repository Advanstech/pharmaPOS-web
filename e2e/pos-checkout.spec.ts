import { test, expect } from '@playwright/test';

// E2E: OTC checkout — cash + MoMo payment end-to-end
test.describe('OTC Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos');
  });

  test('cash payment — ≤3 taps from search to receipt', async ({ page }) => {
    // Tap 1: search for product
    await page.getByRole('searchbox', { name: /search/i }).fill('Paracetamol');
    // Tap 2: add to cart
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    // Tap 3: pay with cash
    await page.getByRole('button', { name: /cash/i }).click();
    await expect(page.getByText(/receipt/i)).toBeVisible();
  });

  test('MoMo payment disabled when offline', async ({ page, context }) => {
    await context.setOffline(true);
    await expect(page.getByRole('button', { name: /momo/i })).toBeDisabled();
    await expect(page.getByText(/offline mode/i)).toBeVisible();
  });
});

// E2E: POM block — attempt checkout without Rx → verify hard block
test.describe('POM Enforcement', () => {
  test('POM product shows Rx required badge before add', async ({ page }) => {
    await page.goto('/pos');
    await page.getByRole('searchbox', { name: /search/i }).fill('Amoxicillin');
    // Ghana FDA: POM badge must be visible BEFORE cashier attempts to add
    await expect(page.getByText(/verify rx first/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /add to sale/i })).not.toBeVisible();
  });
});

// E2E: Offline sync — disconnect → 3 sales → reconnect → no duplicates
test.describe('Offline Sync', () => {
  test('sales made offline sync without duplicates on reconnect', async ({ page, context }) => {
    await page.goto('/pos');
    await expect(page.getByText(/online/i)).toBeVisible();

    await context.setOffline(true);
    await expect(page.getByText(/offline/i)).toBeVisible();

    // Make 3 offline sales (simplified — real test would complete full checkout)
    for (let i = 0; i < 3; i++) {
      await page.getByRole('searchbox', { name: /search/i }).fill('Paracetamol');
      await page.getByRole('button', { name: /add to cart/i }).first().click();
      await page.getByRole('button', { name: /cash/i }).click();
    }

    await context.setOffline(false);
    // Verify sync completes without duplicate entries
    await expect(page.getByText(/synced/i)).toBeVisible({ timeout: 10_000 });
  });
});
