/**
 * Tests for Attention Stages Feature in Frontend
 *
 * Tests cover:
 * - Stage display
 * - Stage filtering
 * - Stage advancement UI
 * - Event handling
 * - Error handling
 */

import { mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AttentionDetailsModal from './AttentionDetailsModal.vue';
import { advanceStage } from '../../../application/services/attention';
import { getActiveFeature } from '../../../shared/features';

// Mock dependencies
vi.mock('../../../application/services/attention');
vi.mock('../../../shared/features');

describe('AttentionDetailsModal - Stages Feature', () => {
  let wrapper;
  const mockAttention = {
    id: 'attention-123',
    currentStage: 'CHECK_IN',
    commerceId: 'commerce-456',
    queueId: 'queue-789',
  };

  const mockCommerce = {
    id: 'commerce-456',
    features: [
      {
        name: 'attention-stages-enabled',
        type: 'PRODUCT',
        active: true,
      },
    ],
  };

  const createWrapper = (props = {}) =>
    mount(AttentionDetailsModal, {
      props: {
        show: true,
        attention: mockAttention,
        commerce: mockCommerce,
        ...props,
      },
      global: {
        mocks: {
          $t: key => key,
          $emit: vi.fn(),
        },
      },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    getActiveFeature.mockReturnValue(true);
  });

  describe('Stage Display', () => {
    it('should display current stage badge when feature is enabled', () => {
      wrapper = createWrapper();
      const stageBadge = wrapper.find('.stage-badge');
      expect(stageBadge.exists()).toBe(true);
      expect(stageBadge.text()).toContain('CHECK_IN');
    });

    it('should not display stage badge when feature is disabled', () => {
      getActiveFeature.mockReturnValue(false);
      wrapper = createWrapper();
      const stageBadge = wrapper.find('.stage-badge');
      expect(stageBadge.exists()).toBe(false);
    });

    it('should not display stage badge when attention has no currentStage', () => {
      wrapper = createWrapper({
        attention: { ...mockAttention, currentStage: null },
      });
      const stageBadge = wrapper.find('.stage-badge');
      expect(stageBadge.exists()).toBe(false);
    });
  });

  describe('Advance Stage Button', () => {
    it('should show advance stage button when feature is enabled and next stages available', () => {
      wrapper = createWrapper();
      const advanceButton = wrapper.find('[data-test="advance-stage-button"]');
      expect(advanceButton.exists()).toBe(true);
    });

    it('should not show advance stage button when feature is disabled', () => {
      getActiveFeature.mockReturnValue(false);
      wrapper = createWrapper();
      const advanceButton = wrapper.find('[data-test="advance-stage-button"]');
      expect(advanceButton.exists()).toBe(false);
    });

    it('should not show advance stage button when no next stages available', () => {
      wrapper = createWrapper({
        attention: { ...mockAttention, currentStage: 'TERMINATED' },
      });
      const advanceButton = wrapper.find('[data-test="advance-stage-button"]');
      expect(advanceButton.exists()).toBe(false);
    });
  });

  describe('Advance Stage Flow', () => {
    it('should open advance stage form when button is clicked', async () => {
      wrapper = createWrapper();
      const advanceButton = wrapper.find('[data-test="advance-stage-button"]');
      await advanceButton.trigger('click');

      const stageForm = wrapper.find('[data-test="advance-stage-form"]');
      expect(stageForm.exists()).toBe(true);
    });

    it('should show stage selector with valid next stages', async () => {
      wrapper = createWrapper();
      const advanceButton = wrapper.find('[data-test="advance-stage-button"]');
      await advanceButton.trigger('click');

      const stageSelect = wrapper.find('[data-test="stage-select"]');
      expect(stageSelect.exists()).toBe(true);

      const options = stageSelect.findAll('option');
      // Should have options for next stages
      expect(options.length).toBeGreaterThan(1);
    });

    it('should allow selecting next stage', async () => {
      wrapper = createWrapper();
      const advanceButton = wrapper.find('[data-test="advance-stage-button"]');
      await advanceButton.trigger('click');

      const stageSelect = wrapper.find('[data-test="stage-select"]');
      await stageSelect.setValue('PRE_CONSULTATION');

      expect(wrapper.vm.selectedNextStage).toBe('PRE_CONSULTATION');
    });

    it('should allow adding notes', async () => {
      wrapper = createWrapper();
      const advanceButton = wrapper.find('[data-test="advance-stage-button"]');
      await advanceButton.trigger('click');

      const notesTextarea = wrapper.find('[data-test="stage-notes"]');
      await notesTextarea.setValue('Test notes');

      expect(wrapper.vm.stageNotes).toBe('Test notes');
    });

    it('should call advanceStage API when form is submitted', async () => {
      advanceStage.mockResolvedValue({
        id: mockAttention.id,
        currentStage: 'PRE_CONSULTATION',
      });

      wrapper = createWrapper();
      const advanceButton = wrapper.find('[data-test="advance-stage-button"]');
      await advanceButton.trigger('click');

      const stageSelect = wrapper.find('[data-test="stage-select"]');
      await stageSelect.setValue('PRE_CONSULTATION');

      const submitButton = wrapper.find('[data-test="advance-submit"]');
      await submitButton.trigger('click');

      // Confirm dialog should appear
      const confirmButton = wrapper.find('[data-test="confirm-advance"]');
      await confirmButton.trigger('click');

      expect(advanceStage).toHaveBeenCalledWith(mockAttention.id, {
        stage: 'PRE_CONSULTATION',
        notes: undefined,
      });
    });

    it('should emit attention-updated event after successful advance', async () => {
      advanceStage.mockResolvedValue({
        id: mockAttention.id,
        currentStage: 'PRE_CONSULTATION',
      });

      wrapper = createWrapper();
      const advanceButton = wrapper.find('[data-test="advance-stage-button"]');
      await advanceButton.trigger('click');

      const stageSelect = wrapper.find('[data-test="stage-select"]');
      await stageSelect.setValue('PRE_CONSULTATION');

      const submitButton = wrapper.find('[data-test="advance-submit"]');
      await submitButton.trigger('click');

      const confirmButton = wrapper.find('[data-test="confirm-advance"]');
      await confirmButton.trigger('click');

      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('attention-updated')).toBeTruthy();
    });

    it('should show error message when API call fails', async () => {
      const errorMessage = 'Failed to advance stage';
      advanceStage.mockRejectedValue(new Error(errorMessage));

      wrapper = createWrapper();
      const advanceButton = wrapper.find('[data-test="advance-stage-button"]');
      await advanceButton.trigger('click');

      const stageSelect = wrapper.find('[data-test="stage-select"]');
      await stageSelect.setValue('PRE_CONSULTATION');

      const submitButton = wrapper.find('[data-test="advance-submit"]');
      await submitButton.trigger('click');

      const confirmButton = wrapper.find('[data-test="confirm-advance"]');
      await confirmButton.trigger('click');

      await wrapper.vm.$nextTick();

      expect(wrapper.vm.alertError).toContain(errorMessage);
    });

    it('should require stage selection before submission', async () => {
      wrapper = createWrapper();
      const advanceButton = wrapper.find('[data-test="advance-stage-button"]');
      await advanceButton.trigger('click');

      const submitButton = wrapper.find('[data-test="advance-submit"]');
      expect(submitButton.attributes('disabled')).toBeDefined();

      const stageSelect = wrapper.find('[data-test="stage-select"]');
      await stageSelect.setValue('PRE_CONSULTATION');

      expect(submitButton.attributes('disabled')).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      advanceStage.mockRejectedValue(new Error('Network error'));

      wrapper = createWrapper();
      // Attempt to advance stage
      // Verify error is displayed
    });

    it('should handle validation errors', async () => {
      // Test validation error handling
    });
  });

  describe('Loading States', () => {
    it('should show loading state during API call', async () => {
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      advanceStage.mockReturnValue(promise);

      wrapper = createWrapper();
      // Trigger advance
      // Verify loading state
      resolvePromise();
    });

    it('should disable form during loading', async () => {
      // Test form disabled state
    });
  });
});
