import { expect } from '@playwright/test';

// Follow the same local discovery gesture as a user; never set component state directly.
export async function revealDevTools(hardware) {
  const panel = hardware.getByRole('region', { name: '开发者调试', exact: true });
  if (!(await panel.isVisible())) {
    const title = hardware
      .getByRole('heading', { name: '连接真实 ESP32', exact: true })
      .getByRole('button');
    for (let index = 0; index < 5; index++) await title.click();
  }
  await expect(panel).toBeVisible();
}
