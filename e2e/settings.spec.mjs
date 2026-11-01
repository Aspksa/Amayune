import {test,expect} from '@playwright/test';
test('settings navigation, search and keyboard access',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#appearance')).toBeVisible();
 await page.locator('[data-page="connection"]').click();
 await expect(page.locator('#connection')).toBeVisible();
 await page.keyboard.press('Control+k');
 await expect(page.locator('#search')).toBeFocused();
 await page.locator('#search').fill('невероятный_запрос_без_совпадений');
 await expect(page.locator('#searchEmpty')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('#searchEmpty')).toBeHidden();
});
test('theme persists after reload',async({page})=>{
 await page.goto('/');
 await page.locator('[data-theme-tile="light"]').click();
 await expect(page.locator('[data-theme-tile="light"]')).toHaveAttribute('aria-pressed','true');
 await page.reload();
 await expect(page.locator('[data-theme-tile="light"]')).toHaveAttribute('aria-pressed','true');
});
for(const [name,width,height] of [['mobile',375,812],['full-hd',1920,1080],['qhd',2560,1440],['4k',3840,2160]]){
 test('responsive viewport '+name,async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto('/');
  await expect(page.locator('#mainContent')).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
  expect(overflow).toBe(false);
 });
}
