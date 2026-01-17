import { test, expect } from '@playwright/test';

test.describe('Sanjou App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await expect(page.locator('.block-view')).toBeVisible();
  });

  test.describe('Initial State', () => {
    test('should display the block tally', async ({ page }) => {
      await expect(page.locator('.sidebar-tally')).toBeVisible();
      await expect(page.locator('.sidebar-label')).toContainText('today');
    });

    test('should display the start button disabled', async ({ page }) => {
      await expect(page.locator('.start-btn')).toBeVisible();
      await expect(page.locator('.start-btn')).toBeDisabled();
    });

    test('should display the meta checklist with all items unchecked', async ({ page }) => {
      const checkboxes = page.locator('.section-box .checkbox');
      await expect(checkboxes).toHaveCount(5);

      // All should be unchecked initially
      for (const checkbox of await checkboxes.all()) {
        await expect(checkbox.locator('input')).not.toBeChecked();
      }
    });

    test('should display the task textarea', async ({ page }) => {
      await expect(page.locator('.task-input')).toBeVisible();
      await expect(page.locator('.task-input')).toHaveAttribute('placeholder', 'What are you working on?');
    });

    test('should display the right now textarea expanded by default', async ({ page }) => {
      // Right now is expanded by default now
      await expect(page.locator('.rightnow-input')).toBeVisible();
    });

    test('should show hint to complete meta checklist', async ({ page }) => {
      await expect(page.locator('.meta-hint')).toContainText('Check all to start');
    });
  });

  test.describe('Meta Checklist', () => {
    test('should allow checking items', async ({ page }) => {
      const firstCheckbox = page.locator('.section-box .checkbox').first();
      await firstCheckbox.click();
      await expect(firstCheckbox.locator('input')).toBeChecked();
    });

    test('should allow unchecking items', async ({ page }) => {
      const firstCheckbox = page.locator('.section-box .checkbox').first();
      await firstCheckbox.click();
      await expect(firstCheckbox.locator('input')).toBeChecked();
      await firstCheckbox.click();
      await expect(firstCheckbox.locator('input')).not.toBeChecked();
    });

    test('should show ready hint when all items are checked', async ({ page }) => {
      const checkboxes = page.locator('.section-box .checkbox');

      // Check all items
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }

      await expect(page.locator('.meta-hint')).toContainText('Ready to focus');
    });
  });

  test.describe('Task Input', () => {
    test('should allow entering a task with multiple lines', async ({ page }) => {
      const taskInput = page.locator('.task-input');
      await taskInput.fill('Line 1\nLine 2\nLine 3');
      await expect(taskInput).toHaveValue('Line 1\nLine 2\nLine 3');
    });

    test('should not show task input when timer is running', async ({ page }) => {
      // Complete meta checklist
      const checkboxes = page.locator('.section-box .checkbox');
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }

      // Start timer
      await page.locator('.start-btn').click();

      // Idle view with task input should be gone, running view active
      await expect(page.locator('.idle-view')).not.toBeVisible();
      await expect(page.locator('.running-view')).toBeVisible();
    });
  });

  test.describe('Right Now List', () => {
    test('should be visible by default', async ({ page }) => {
      // Right now is expanded by default
      await expect(page.locator('.rightnow-input')).toBeVisible();
    });

    test('should allow entering items', async ({ page }) => {
      const rnlInput = page.locator('.rightnow-input');
      await rnlInput.fill('- First thing\n- Second thing\n- Third thing');
      await expect(rnlInput).toHaveValue('- First thing\n- Second thing\n- Third thing');
    });

    test('should be expanded and editable when timer is running', async ({ page }) => {
      // Complete meta checklist
      const checkboxes = page.locator('.section-box .checkbox');
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }

      // Start timer
      await page.locator('.start-btn').click();

      // Right Now input should be visible and editable in running view
      await expect(page.locator('.rightnow-input')).toBeVisible();
      await expect(page.locator('.rightnow-input')).not.toBeDisabled();
    });
  });

  test.describe('Timer', () => {
    test('should not start when meta checklist is incomplete', async ({ page }) => {
      // Start button should be disabled when meta checklist is incomplete
      await expect(page.locator('.start-btn')).toBeDisabled();
    });

    test('should start when meta checklist is complete', async ({ page }) => {
      // Complete meta checklist
      const checkboxes = page.locator('.section-box .checkbox');
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }

      // Start timer
      await page.locator('.start-btn').click();

      // Should show running view with timer
      await expect(page.locator('.timer-prominent')).toBeVisible();
      await expect(page.locator('.timer-label')).toContainText('Focus');
    });

    test('should pause and resume', async ({ page }) => {
      // Complete meta checklist
      const checkboxes = page.locator('.section-box .checkbox');
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }

      // Start timer
      await page.locator('.start-btn').click();
      await expect(page.locator('.timer-label')).toContainText('Focus');

      // Click sidebar and use Alt+Space to pause
      await page.locator('.sidebar-header').click();
      await page.keyboard.press('Alt+Space');
      await expect(page.locator('.timer-label')).toContainText('Paused');

      // Resume using button
      await page.locator('.pause-btn.resume').click();
      await expect(page.locator('.timer-label')).toContainText('Focus');
    });

    test('should show reset button when paused', async ({ page }) => {
      // Complete meta checklist
      const checkboxes = page.locator('.section-box .checkbox');
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }

      // Start and pause timer
      await page.locator('.start-btn').click();
      await page.locator('.sidebar-header').click();
      await page.keyboard.press('Alt+Space');

      // Reset button should be visible
      await expect(page.locator('.pause-btn.reset')).toBeVisible();
    });

    test('should reset timer', async ({ page }) => {
      // Complete meta checklist
      const checkboxes = page.locator('.section-box .checkbox');
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }

      // Start, pause, then reset timer
      await page.locator('.start-btn').click();
      await page.locator('.sidebar-header').click();
      await page.keyboard.press('Alt+Space');
      await page.locator('.pause-btn.reset').click();

      // Should be back to idle view
      await expect(page.locator('.idle-view')).toBeVisible();
      await expect(page.locator('.start-btn')).toBeVisible();
    });

    test('should start with Alt+Enter key when meta complete', async ({ page }) => {
      // Complete meta checklist
      const checkboxes = page.locator('.section-box .checkbox');
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }

      // Click sidebar to defocus inputs
      await page.locator('.sidebar-header').click();

      // Press Alt+Enter to start
      await page.keyboard.press('Alt+Enter');
      await expect(page.locator('.timer-label')).toContainText('Focus');
    });
  });

  test.describe('Mark Interrupted', () => {
    test('should show interrupt button when timer is running', async ({ page }) => {
      // Complete meta checklist
      const checkboxes = page.locator('.section-box .checkbox');
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }

      // Start timer
      await page.locator('.start-btn').click();

      // Interrupt button should be visible
      await expect(page.locator('.interrupt-btn')).toBeVisible();
      await expect(page.locator('.interrupt-btn')).toContainText('Interrupted');
    });

    test('should reset timer when interrupted', async ({ page }) => {
      // Complete meta checklist
      const checkboxes = page.locator('.section-box .checkbox');
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }

      // Start timer then interrupt
      await page.locator('.start-btn').click();
      await page.locator('.interrupt-btn').click();

      // Should be back to idle view
      await expect(page.locator('.idle-view')).toBeVisible();
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should toggle timer with Alt+Space key (when not in text field)', async ({ page }) => {
      // Complete meta checklist
      const checkboxes = page.locator('.section-box .checkbox');
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }

      // Click on sidebar to remove focus from input
      await page.locator('.sidebar-header').click();

      // Press Alt+Space to start
      await page.keyboard.press('Alt+Space');
      await expect(page.locator('.timer-label')).toContainText('Focus');

      // Press Alt+Space to pause
      await page.keyboard.press('Alt+Space');
      await expect(page.locator('.timer-label')).toContainText('Paused');
    });

    test('should reset timer with Alt+R key when paused', async ({ page }) => {
      // Complete meta checklist
      const checkboxes = page.locator('.section-box .checkbox');
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }

      // Start and pause timer
      await page.locator('.start-btn').click();
      await page.locator('.sidebar-header').click();
      await page.keyboard.press('Alt+Space');

      // Press Alt+R to reset
      await page.keyboard.press('Alt+r');
      await expect(page.locator('.idle-view')).toBeVisible();
    });

    test('should mark interrupted with Alt+I key when running', async ({ page }) => {
      // Complete meta checklist
      const checkboxes = page.locator('.section-box .checkbox');
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }

      // Start timer
      await page.locator('.start-btn').click();
      await expect(page.locator('.timer-label')).toContainText('Focus');

      // Click sidebar to ensure we're not in a text field
      await page.locator('.sidebar-header').click();

      // Press Alt+I to interrupt
      await page.keyboard.press('Alt+i');
      await expect(page.locator('.idle-view')).toBeVisible();
    });
  });

  test.describe('Settings', () => {
    test('should open settings with Alt+S key', async ({ page }) => {
      // Click on sidebar to remove focus from inputs
      await page.locator('.sidebar-header').click();
      await page.keyboard.press('Alt+s');
      await expect(page.locator('.modal-title')).toContainText('Settings');
    });

    test('should close settings with Escape', async ({ page }) => {
      await page.locator('.sidebar-header').click();
      await page.keyboard.press('Alt+s');
      await expect(page.locator('.modal')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator('.modal')).not.toBeVisible();
    });

    test('should change block duration', async ({ page }) => {
      await page.locator('.sidebar-header').click();
      await page.keyboard.press('Alt+s');

      const durationInput = page.locator('.setting-input').first();
      await durationInput.fill('30');

      await page.keyboard.press('Escape');

      // Complete meta and start to see the timer
      const checkboxes = page.locator('.section-box .checkbox');
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }
      await page.locator('.start-btn').click();

      // Timer should show new duration
      await expect(page.locator('.timer-time')).toContainText('30:00');
    });

    test('should toggle sound', async ({ page }) => {
      await page.locator('.sidebar-header').click();
      await page.keyboard.press('Alt+s');

      const toggle = page.locator('.setting-toggle').first();
      await toggle.click();

      // Toggle state should change
      await expect(toggle).not.toHaveClass(/setting-toggle-on/);
    });
  });

  test.describe('History View', () => {
    test('should open history with Alt+H key', async ({ page }) => {
      await page.locator('.sidebar-header').click();
      await page.keyboard.press('Alt+h');
      await expect(page.locator('.history-view')).toBeVisible();
      await expect(page.locator('.history-title')).toContainText('Block History');
    });

    test('should close history with Alt+H key', async ({ page }) => {
      await page.locator('.sidebar-header').click();
      await page.keyboard.press('Alt+h');
      await expect(page.locator('.history-view')).toBeVisible();

      await page.keyboard.press('Alt+h');
      await expect(page.locator('.history-view')).not.toBeVisible();
      await expect(page.locator('.block-view')).toBeVisible();
    });

    test('should close history with Escape key', async ({ page }) => {
      await page.locator('.sidebar-header').click();
      await page.keyboard.press('Alt+h');
      await expect(page.locator('.history-view')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator('.history-view')).not.toBeVisible();
    });

    test('should close history with back button', async ({ page }) => {
      await page.locator('.sidebar-header').click();
      await page.keyboard.press('Alt+h');
      await expect(page.locator('.history-view')).toBeVisible();

      await page.locator('.history-back').click();
      await expect(page.locator('.history-view')).not.toBeVisible();
    });

    test('should show empty state when no blocks', async ({ page }) => {
      await page.locator('.sidebar-header').click();
      await page.keyboard.press('Alt+h');
      await expect(page.locator('.history-empty')).toBeVisible();
      await expect(page.locator('.history-empty')).toContainText('No blocks yet');
    });
  });

  test.describe('Shortcut Hints', () => {
    test('should show idle hints when timer is idle', async ({ page }) => {
      await expect(page.locator('.footer-hints')).toBeVisible();
      await expect(page.locator('.footer-hints')).toContainText('Alt');
      await expect(page.locator('.footer-hints')).toContainText('1-5');
      await expect(page.locator('.footer-hints')).toContainText('Enter');
    });

    test('should show running hints when timer is running', async ({ page }) => {
      // Complete meta checklist
      const checkboxes = page.locator('.section-box .checkbox');
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }

      // Start timer
      await page.locator('.start-btn').click();

      // Check running hints
      await expect(page.locator('.footer-hints')).toContainText('Alt');
      await expect(page.locator('.footer-hints')).toContainText('Space');
    });

    test('should show paused hints when timer is paused', async ({ page }) => {
      // Complete meta checklist
      const checkboxes = page.locator('.section-box .checkbox');
      for (const checkbox of await checkboxes.all()) {
        await checkbox.click();
      }

      // Start and pause timer
      await page.locator('.start-btn').click();
      await page.locator('.sidebar-header').click();
      await page.keyboard.press('Alt+Space');

      // Check paused hints
      await expect(page.locator('.footer-hints')).toContainText('Alt');
      await expect(page.locator('.footer-hints')).toContainText('resume');
    });
  });

  test.describe('Number Key Shortcuts', () => {
    test('should toggle meta checkboxes with Alt+number keys 1-5', async ({ page }) => {
      // Click sidebar to ensure focus is outside text fields
      await page.locator('.sidebar-header').click();

      // Press Alt+1 to toggle first checkbox
      await page.keyboard.press('Alt+1');
      const firstCheckbox = page.locator('.section-box .checkbox').first();
      await expect(firstCheckbox.locator('input')).toBeChecked();

      // Press Alt+2 to toggle second checkbox
      await page.keyboard.press('Alt+2');
      const secondCheckbox = page.locator('.section-box .checkbox').nth(1);
      await expect(secondCheckbox.locator('input')).toBeChecked();

      // Press Alt+1 again to uncheck first checkbox
      await page.keyboard.press('Alt+1');
      await expect(firstCheckbox.locator('input')).not.toBeChecked();
    });

    test('should start timer with Alt+Enter when meta is complete', async ({ page }) => {
      // Click sidebar to ensure focus is outside text fields
      await page.locator('.sidebar-header').click();

      // Use Alt+number keys to complete all meta items
      await page.keyboard.press('Alt+1');
      await page.keyboard.press('Alt+2');
      await page.keyboard.press('Alt+3');
      await page.keyboard.press('Alt+4');
      await page.keyboard.press('Alt+5');

      // Press Alt+Enter to start
      await page.keyboard.press('Alt+Enter');
      await expect(page.locator('.timer-label')).toContainText('Focus');
    });
  });

  test.describe('History Sidebar', () => {
    test('should show history sidebar on main view', async ({ page }) => {
      await expect(page.locator('.history-sidebar')).toBeVisible();
      await expect(page.locator('.sidebar-tally')).toBeVisible();
    });

    test('should show empty state when no blocks', async ({ page }) => {
      await expect(page.locator('.sidebar-empty')).toBeVisible();
      await expect(page.locator('.sidebar-empty')).toContainText('No blocks yet');
    });
  });
});
