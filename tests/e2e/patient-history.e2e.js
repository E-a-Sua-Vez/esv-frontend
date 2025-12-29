/**
 * End-to-End tests for Patient History (Prontuario) workflows
 * Tests the complete user journey from creation to retrieval
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { chromium } from 'playwright';

describe('Patient History E2E Tests', () => {
  let browser;
  let context;
  let page;

  const testData = {
    commerce: {
      id: 'test-commerce-e2e',
      name: 'Test Medical Center E2E',
    },
    client: {
      id: 'test-client-e2e',
      name: 'John',
      lastName: 'Doe E2E',
      idNumber: '12345678E2E',
      phone: '+1234567890',
      email: 'john.doe.e2e@test.com',
    },
    attention: {
      id: 'test-attention-e2e',
      date: new Date().toISOString(),
    },
    user: {
      email: 'doctor.e2e@test.com',
      password: 'testpassword123',
      name: 'Dr. Test E2E',
    },
  };

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: 100, // Add delay for better visibility in non-CI environments
    });
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
  });

  afterAll(async () => {
    await context?.close();
    await browser?.close();
  });

  beforeEach(async () => {
    page = await context.newPage();

    // Setup request/response logging for debugging
    page.on('request', request => {
      if (request.url().includes('/patient-history')) {
        console.log(`→ ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/patient-history')) {
        console.log(`← ${response.status()} ${response.url()}`);
      }
    });

    // Login before each test
    await loginUser(page, testData.user);
  });

  describe('Complete Patient History Workflow', () => {
    it('should create, save, and retrieve a complete patient history', async () => {
      // Step 1: Navigate to patient history creation
      await page.goto('/collaborator/attention/validate');
      await page.waitForSelector('[data-testid="patient-search"]');

      // Step 2: Search and select patient
      await page.fill('[data-testid="patient-search-input"]', testData.client.idNumber);
      await page.click('[data-testid="search-patient-button"]');
      await page.waitForSelector('[data-testid="patient-result"]');
      await page.click('[data-testid="select-patient-button"]');

      // Step 3: Start new attention
      await page.click('[data-testid="start-attention-button"]');
      await page.waitForSelector('[data-testid="patient-history-form"]');

      // Step 4: Fill personal data
      await fillPersonalData(page, {
        name: testData.client.name,
        lastName: testData.client.lastName,
        phone: testData.client.phone,
        occupation: 'Software Engineer',
        civilStatus: 'Single',
        sex: 'M',
        age: '33',
        birthday: '1990-01-01',
      });

      // Step 5: Fill consultation reason
      await page.click('[data-testid="consultation-reason-tab"]');
      await page.fill(
        '[data-testid="consultation-reason-input"]',
        'Routine checkup and health assessment',
      );
      await page.click('[data-testid="add-consultation-reason-button"]');

      // Step 6: Fill current illness
      await page.click('[data-testid="current-illness-tab"]');
      await page.fill(
        '[data-testid="current-illness-input"]',
        'Patient reports mild headaches in the morning',
      );
      await page.selectOption('[data-testid="illness-duration-select"]', '1-week');
      await page.click('[data-testid="add-current-illness-button"]');

      // Step 7: Fill functional exam
      await page.click('[data-testid="functional-exam-tab"]');
      await page.fill('[data-testid="blood-pressure-input"]', '120/80');
      await page.fill('[data-testid="heart-rate-input"]', '72');
      await page.fill('[data-testid="temperature-input"]', '36.5');
      await page.fill('[data-testid="weight-input"]', '70');
      await page.fill('[data-testid="height-input"]', '175');

      // Step 8: Fill diagnostic
      await page.click('[data-testid="diagnostic-tab"]');
      await page.fill(
        '[data-testid="diagnostic-input"]',
        'Patient in good general health. Mild tension headaches likely stress-related.',
      );
      await page.selectOption('[data-testid="diagnostic-type-select"]', 'preliminary');

      // Step 9: Save patient history
      await page.click('[data-testid="save-patient-history-button"]');

      // Wait for save confirmation
      await page.waitForSelector('[data-testid="save-success-message"]', { timeout: 10000 });
      expect(await page.textContent('[data-testid="save-success-message"]')).toContain(
        'Patient history saved successfully',
      );

      // Step 10: Verify data persistence - reload page
      await page.reload();
      await page.waitForSelector('[data-testid="patient-history-form"]');

      // Step 11: Verify all data is still present
      await verifyPersonalData(page, {
        name: testData.client.name,
        lastName: testData.client.lastName,
        phone: testData.client.phone,
      });

      await page.click('[data-testid="consultation-reason-tab"]');
      expect(await page.textContent('[data-testid="consultation-reason-list"]')).toContain(
        'Routine checkup and health assessment',
      );

      await page.click('[data-testid="current-illness-tab"]');
      expect(await page.textContent('[data-testid="current-illness-list"]')).toContain(
        'mild headaches in the morning',
      );

      await page.click('[data-testid="diagnostic-tab"]');
      expect(await page.inputValue('[data-testid="diagnostic-input"]')).toContain(
        'good general health',
      );
    });

    it('should handle patient history updates correctly', async () => {
      // First create a basic patient history
      await createBasicPatientHistory(page, testData);

      // Navigate to edit mode
      await page.click('[data-testid="edit-patient-history-button"]');
      await page.waitForSelector('[data-testid="patient-history-form"]:not([readonly])');

      // Update personal data
      await page.fill('[data-testid="phone-input"]', '+9876543210');
      await page.fill('[data-testid="occupation-input"]', 'Senior Software Engineer');

      // Add new consultation reason
      await page.click('[data-testid="consultation-reason-tab"]');
      await page.fill(
        '[data-testid="consultation-reason-input"]',
        'Follow-up consultation for headaches',
      );
      await page.click('[data-testid="add-consultation-reason-button"]');

      // Save updates
      await page.click('[data-testid="save-patient-history-button"]');
      await page.waitForSelector('[data-testid="save-success-message"]');

      // Verify updates
      await page.reload();
      await page.waitForSelector('[data-testid="patient-history-form"]');

      expect(await page.inputValue('[data-testid="phone-input"]')).toBe('+9876543210');
      expect(await page.inputValue('[data-testid="occupation-input"]')).toBe(
        'Senior Software Engineer',
      );

      await page.click('[data-testid="consultation-reason-tab"]');
      const consultationReasons = await page.textContent(
        '[data-testid="consultation-reason-list"]',
      );
      expect(consultationReasons).toContain('Follow-up consultation for headaches');
    });

    it('should maintain data integrity across multiple sessions', async () => {
      // Create patient history in first session
      const patientHistoryId = await createBasicPatientHistory(page, testData);

      // Simulate logout and login (new session)
      await page.click('[data-testid="logout-button"]');
      await page.waitForSelector('[data-testid="login-form"]');
      await loginUser(page, testData.user);

      // Navigate back to the same patient
      await navigateToPatientHistory(page, testData.client.idNumber);

      // Verify data is still present and consistent
      await verifyPersonalData(page, {
        name: testData.client.name,
        lastName: testData.client.lastName,
      });

      // Check that the patient history ID is consistent
      const currentHistoryId = await page.getAttribute(
        '[data-testid="patient-history-form"]',
        'data-history-id',
      );
      expect(currentHistoryId).toBe(patientHistoryId);
    });
  });

  describe('Data Validation and Error Handling', () => {
    it('should validate required fields and show appropriate errors', async () => {
      await page.goto('/collaborator/attention/validate');
      await navigateToNewPatientHistory(page);

      // Try to save without required fields
      await page.click('[data-testid="save-patient-history-button"]');

      // Check for validation errors
      await page.waitForSelector('[data-testid="validation-error"]');
      expect(await page.textContent('[data-testid="name-error"]')).toContain('Name is required');
      expect(await page.textContent('[data-testid="lastname-error"]')).toContain(
        'Last name is required',
      );
      expect(await page.textContent('[data-testid="idnumber-error"]')).toContain(
        'ID number is required',
      );

      // Fill required fields and verify errors disappear
      await page.fill('[data-testid="name-input"]', 'John');
      await page.fill('[data-testid="lastname-input"]', 'Doe');
      await page.fill('[data-testid="idnumber-input"]', '12345678');

      // Errors should be cleared
      expect(await page.locator('[data-testid="name-error"]').count()).toBe(0);
      expect(await page.locator('[data-testid="lastname-error"]').count()).toBe(0);
      expect(await page.locator('[data-testid="idnumber-error"]').count()).toBe(0);
    });

    it('should handle network errors gracefully', async () => {
      await createBasicPatientHistory(page, testData);

      // Simulate network failure
      await page.route('**/patient-history/**', route => {
        route.abort('failed');
      });

      // Try to save changes
      await page.fill('[data-testid="phone-input"]', '+9999999999');
      await page.click('[data-testid="save-patient-history-button"]');

      // Check for error message
      await page.waitForSelector('[data-testid="network-error-message"]');
      expect(await page.textContent('[data-testid="network-error-message"]')).toContain(
        'Network error',
      );

      // Verify retry functionality
      await page.unroute('**/patient-history/**');
      await page.click('[data-testid="retry-save-button"]');
      await page.waitForSelector('[data-testid="save-success-message"]');
    });

    it('should handle concurrent editing scenarios', async () => {
      await createBasicPatientHistory(page, testData);

      // Open same patient history in second tab
      const secondPage = await context.newPage();
      await loginUser(secondPage, testData.user);
      await navigateToPatientHistory(secondPage, testData.client.idNumber);

      // Make changes in first tab
      await page.fill('[data-testid="phone-input"]', '+1111111111');
      await page.click('[data-testid="save-patient-history-button"]');
      await page.waitForSelector('[data-testid="save-success-message"]');

      // Make different changes in second tab
      await secondPage.fill('[data-testid="phone-input"]', '+2222222222');
      await secondPage.click('[data-testid="save-patient-history-button"]');

      // Should show conflict warning
      await secondPage.waitForSelector('[data-testid="conflict-warning"]');
      expect(await secondPage.textContent('[data-testid="conflict-warning"]')).toContain(
        'has been modified by another user',
      );

      await secondPage.close();
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle large patient history data efficiently', async () => {
      await createBasicPatientHistory(page, testData);

      const startTime = Date.now();

      // Add multiple consultation reasons (simulate large dataset)
      await page.click('[data-testid="consultation-reason-tab"]');
      for (let i = 0; i < 10; i++) {
        await page.fill(
          '[data-testid="consultation-reason-input"]',
          `Consultation reason ${
            i + 1
          } - detailed description with lots of text to simulate real-world usage`,
        );
        await page.click('[data-testid="add-consultation-reason-button"]');
      }

      // Add multiple current illness entries
      await page.click('[data-testid="current-illness-tab"]');
      for (let i = 0; i < 10; i++) {
        await page.fill(
          '[data-testid="current-illness-input"]',
          `Current illness ${i + 1} - detailed medical description`,
        );
        await page.click('[data-testid="add-current-illness-button"]');
      }

      // Save large dataset
      await page.click('[data-testid="save-patient-history-button"]');
      await page.waitForSelector('[data-testid="save-success-message"]');

      const saveTime = Date.now() - startTime;
      console.log(`Large dataset save time: ${saveTime}ms`);

      // Verify save time is reasonable (less than 10 seconds)
      expect(saveTime).toBeLessThan(10000);

      // Test loading performance
      const loadStartTime = Date.now();
      await page.reload();
      await page.waitForSelector('[data-testid="patient-history-form"]');
      const loadTime = Date.now() - loadStartTime;

      console.log(`Large dataset load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
    });

    it('should handle rapid successive saves without data loss', async () => {
      await createBasicPatientHistory(page, testData);

      // Make rapid successive changes
      const changes = [
        { field: '[data-testid="phone-input"]', value: '+1111111111' },
        { field: '[data-testid="occupation-input"]', value: 'Engineer' },
        { field: '[data-testid="phone-input"]', value: '+2222222222' },
        { field: '[data-testid="occupation-input"]', value: 'Senior Engineer' },
        { field: '[data-testid="phone-input"]', value: '+3333333333' },
      ];

      for (const change of changes) {
        await page.fill(change.field, change.value);
        await page.click('[data-testid="save-patient-history-button"]');
        // Don't wait for success message to simulate rapid changes
      }

      // Wait for final save to complete
      await page.waitForSelector('[data-testid="save-success-message"]');

      // Verify final state
      await page.reload();
      await page.waitForSelector('[data-testid="patient-history-form"]');

      expect(await page.inputValue('[data-testid="phone-input"]')).toBe('+3333333333');
      expect(await page.inputValue('[data-testid="occupation-input"]')).toBe('Senior Engineer');
    });
  });

  describe('Data History and Audit Trail', () => {
    it('should maintain proper audit trail for patient history changes', async () => {
      await createBasicPatientHistory(page, testData);

      // Make several changes with different users if possible
      await page.fill('[data-testid="phone-input"]', '+1111111111');
      await page.click('[data-testid="save-patient-history-button"]');
      await page.waitForSelector('[data-testid="save-success-message"]');

      await page.fill('[data-testid="occupation-input"]', 'Updated Occupation');
      await page.click('[data-testid="save-patient-history-button"]');
      await page.waitForSelector('[data-testid="save-success-message"]');

      // Check audit trail (if available in UI)
      if ((await page.locator('[data-testid="view-history-button"]').count()) > 0) {
        await page.click('[data-testid="view-history-button"]');
        await page.waitForSelector('[data-testid="history-timeline"]');

        const historyEntries = await page.locator('[data-testid="history-entry"]').count();
        expect(historyEntries).toBeGreaterThan(1);

        // Verify timestamps are in correct order
        const timestamps = await page
          .locator('[data-testid="history-timestamp"]')
          .allTextContents();
        const sortedTimestamps = [...timestamps].sort();
        expect(timestamps).toEqual(sortedTimestamps.reverse()); // Most recent first
      }
    });
  });

  // Helper functions
  async function loginUser(page, user) {
    await page.goto('/login');
    await page.waitForSelector('[data-testid="login-form"]');
    await page.fill('[data-testid="email-input"]', user.email);
    await page.fill('[data-testid="password-input"]', user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard"]');
  }

  async function fillPersonalData(page, data) {
    await page.fill('[data-testid="name-input"]', data.name);
    await page.fill('[data-testid="lastname-input"]', data.lastName);
    await page.fill('[data-testid="phone-input"]', data.phone);
    await page.fill('[data-testid="occupation-input"]', data.occupation);
    await page.selectOption('[data-testid="civil-status-select"]', data.civilStatus);
    await page.selectOption('[data-testid="sex-select"]', data.sex);
    await page.fill('[data-testid="age-input"]', data.age);
    await page.fill('[data-testid="birthday-input"]', data.birthday);
  }

  async function verifyPersonalData(page, data) {
    if (data.name) {
      expect(await page.inputValue('[data-testid="name-input"]')).toBe(data.name);
    }
    if (data.lastName) {
      expect(await page.inputValue('[data-testid="lastname-input"]')).toBe(data.lastName);
    }
    if (data.phone) {
      expect(await page.inputValue('[data-testid="phone-input"]')).toBe(data.phone);
    }
  }

  async function createBasicPatientHistory(page, testData) {
    await page.goto('/collaborator/attention/validate');
    await navigateToNewPatientHistory(page);

    await fillPersonalData(page, {
      name: testData.client.name,
      lastName: testData.client.lastName,
      phone: testData.client.phone,
      occupation: 'Software Engineer',
      civilStatus: 'Single',
      sex: 'M',
      age: '33',
      birthday: '1990-01-01',
    });

    await page.click('[data-testid="save-patient-history-button"]');
    await page.waitForSelector('[data-testid="save-success-message"]');

    // Return the patient history ID for reference
    return await page.getAttribute('[data-testid="patient-history-form"]', 'data-history-id');
  }

  async function navigateToNewPatientHistory(page) {
    await page.waitForSelector('[data-testid="patient-search"]');
    await page.fill('[data-testid="patient-search-input"]', testData.client.idNumber);
    await page.click('[data-testid="search-patient-button"]');
    await page.waitForSelector('[data-testid="patient-result"]');
    await page.click('[data-testid="select-patient-button"]');
    await page.click('[data-testid="start-attention-button"]');
    await page.waitForSelector('[data-testid="patient-history-form"]');
  }

  async function navigateToPatientHistory(page, clientIdNumber) {
    await page.goto('/collaborator/attention/validate');
    await page.fill('[data-testid="patient-search-input"]', clientIdNumber);
    await page.click('[data-testid="search-patient-button"]');
    await page.waitForSelector('[data-testid="patient-result"]');
    await page.click('[data-testid="view-patient-button"]');
    await page.waitForSelector('[data-testid="patient-history-form"]');
  }
});
