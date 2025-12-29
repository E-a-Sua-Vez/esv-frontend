/**
 * Unit tests for PatientHistoryManagement.vue component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PatientHistoryManagement from '@/components/patient-history/domain/PatientHistoryManagement.vue';
import * as patientHistoryService from '@/application/services/patient-history';

// Mock the patient history service
vi.mock('@/application/services/patient-history', () => ({
  getPatientHistoryByCommerceIdAndClientId: vi.fn(),
  savePatientHistory: vi.fn(),
  updatePatientHistory: vi.fn(),
  deletePatientHistory: vi.fn(),
}));

// Mock other dependencies
vi.mock('@/application/services/client', () => ({
  getClientById: vi.fn(),
}));

vi.mock('@/application/services/attention', () => ({
  getAttentionById: vi.fn(),
}));

describe('PatientHistoryManagement', () => {
  let wrapper;
  let pinia;

  const mockPatientHistory = {
    id: 'test-patient-history-id',
    commerceId: 'test-commerce-id',
    clientId: 'test-client-id',
    lastAttentionId: 'test-attention-id',
    type: 'STANDARD',
    personalData: {
      name: 'John',
      lastName: 'Doe',
      idNumber: '12345678',
      birthday: '1990-01-01',
      age: 33,
      civilStatus: 'Single',
      sex: 'M',
      occupation: 'Engineer',
      addressText: '123 Main St',
      phone: '+1234567890',
    },
    consultationReason: [],
    currentIllness: [],
    patientAnamnese: [],
    functionalExam: [],
    physicalExam: [],
    diagnostic: [],
    medicalOrder: [],
    control: [],
    patientDocument: [],
    aditionalInfo: {},
    active: true,
    available: true,
    createdAt: new Date().toISOString(),
    createdBy: 'test-user',
  };

  const mockProps = {
    commerceId: 'test-commerce-id',
    clientId: 'test-client-id',
    attentionId: 'test-attention-id',
    isEditable: true,
  };

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Component Initialization', () => {
    it('should mount successfully with required props', () => {
      // Act
      wrapper = mount(PatientHistoryManagement, {
        props: mockProps,
        global: {
          plugins: [pinia],
        },
      });

      // Assert
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.commerceId).toBe(mockProps.commerceId);
      expect(wrapper.vm.clientId).toBe(mockProps.clientId);
      expect(wrapper.vm.attentionId).toBe(mockProps.attentionId);
    });

    it('should initialize with default values', () => {
      // Act
      wrapper = mount(PatientHistoryManagement, {
        props: mockProps,
        global: {
          plugins: [pinia],
        },
      });

      // Assert
      expect(wrapper.vm.loading).toBe(false);
      expect(wrapper.vm.saving).toBe(false);
      expect(wrapper.vm.patientHistory).toEqual({});
      expect(wrapper.vm.errors).toEqual({});
    });

    it('should load patient history on mount', async () => {
      // Arrange
      patientHistoryService.getPatientHistoryByCommerceIdAndClientId.mockResolvedValue([
        mockPatientHistory,
      ]);

      // Act
      wrapper = mount(PatientHistoryManagement, {
        props: mockProps,
        global: {
          plugins: [pinia],
        },
      });

      await flushPromises();

      // Assert
      expect(patientHistoryService.getPatientHistoryByCommerceIdAndClientId).toHaveBeenCalledWith(
        mockProps.commerceId,
        mockProps.clientId,
      );
      expect(wrapper.vm.patientHistory).toEqual(mockPatientHistory);
    });
  });

  describe('Data Loading', () => {
    it('should handle loading state correctly', async () => {
      // Arrange
      let resolvePromise;
      const loadingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      patientHistoryService.getPatientHistoryByCommerceIdAndClientId.mockReturnValue(
        loadingPromise,
      );

      // Act
      wrapper = mount(PatientHistoryManagement, {
        props: mockProps,
        global: {
          plugins: [pinia],
        },
      });

      // Assert - Should be loading
      expect(wrapper.vm.loading).toBe(true);

      // Complete the promise
      resolvePromise([mockPatientHistory]);
      await flushPromises();

      // Assert - Should no longer be loading
      expect(wrapper.vm.loading).toBe(false);
    });

    it('should handle empty patient history list', async () => {
      // Arrange
      patientHistoryService.getPatientHistoryByCommerceIdAndClientId.mockResolvedValue([]);

      // Act
      wrapper = mount(PatientHistoryManagement, {
        props: mockProps,
        global: {
          plugins: [pinia],
        },
      });

      await flushPromises();

      // Assert
      expect(wrapper.vm.patientHistory).toEqual({});
      expect(wrapper.vm.isNewRecord).toBe(true);
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const error = new Error('Service unavailable');
      patientHistoryService.getPatientHistoryByCommerceIdAndClientId.mockRejectedValue(error);

      // Act
      wrapper = mount(PatientHistoryManagement, {
        props: mockProps,
        global: {
          plugins: [pinia],
        },
      });

      await flushPromises();

      // Assert
      expect(wrapper.vm.loading).toBe(false);
      expect(wrapper.vm.errors.loading).toBe('Error loading patient history');
    });
  });

  describe('Data Saving', () => {
    beforeEach(async () => {
      patientHistoryService.getPatientHistoryByCommerceIdAndClientId.mockResolvedValue([
        mockPatientHistory,
      ]);

      wrapper = mount(PatientHistoryManagement, {
        props: mockProps,
        global: {
          plugins: [pinia],
        },
      });

      await flushPromises();
    });

    it('should save patient history successfully', async () => {
      // Arrange
      const updatedHistory = {
        ...mockPatientHistory,
        personalData: { ...mockPatientHistory.personalData, name: 'Jane' },
      };
      patientHistoryService.savePatientHistory.mockResolvedValue(updatedHistory);

      // Act
      wrapper.vm.patientHistory.personalData.name = 'Jane';
      await wrapper.vm.savePatientHistory();

      // Assert
      expect(patientHistoryService.savePatientHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          commerceId: mockProps.commerceId,
          clientId: mockProps.clientId,
          personalData: expect.objectContaining({
            name: 'Jane',
          }),
        })
      );
      expect(wrapper.vm.saving).toBe(false);
      expect(wrapper.vm.errors.saving).toBeUndefined();
    });

    it('should handle saving state correctly', async () => {
      // Arrange
      let resolveSave;
      const savePromise = new Promise(resolve => {
        resolveSave = resolve;
      });

      patientHistoryService.savePatientHistory.mockReturnValue(savePromise);

      // Act
      const saveCall = wrapper.vm.savePatientHistory();

      // Assert - Should be saving
      expect(wrapper.vm.saving).toBe(true);

      // Complete the save
      resolveSave(mockPatientHistory);
      await saveCall;

      // Assert - Should no longer be saving
      expect(wrapper.vm.saving).toBe(false);
    });

    it('should handle save errors gracefully', async () => {
      // Arrange
      const error = new Error('Save failed');
      patientHistoryService.savePatientHistory.mockRejectedValue(error);

      // Act
      await wrapper.vm.savePatientHistory();

      // Assert
      expect(wrapper.vm.saving).toBe(false);
      expect(wrapper.vm.errors.saving).toBe('Error saving patient history');
    });

    it('should validate required fields before saving', async () => {
      // Arrange
      wrapper.vm.patientHistory.personalData.name = '';
      wrapper.vm.patientHistory.personalData.lastName = '';

      // Act
      const isValid = await wrapper.vm.validateForm();

      // Assert
      expect(isValid).toBe(false);
      expect(wrapper.vm.errors.personalData).toBeDefined();
      expect(patientHistoryService.savePatientHistory).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    beforeEach(async () => {
      patientHistoryService.getPatientHistoryByCommerceIdAndClientId.mockResolvedValue([
        mockPatientHistory,
      ]);

      wrapper = mount(PatientHistoryManagement, {
        props: mockProps,
        global: {
          plugins: [pinia],
        },
      });

      await flushPromises();
    });

    it('should validate personal data fields', async () => {
      // Arrange
      wrapper.vm.patientHistory.personalData = {
        name: '',
        lastName: '',
        idNumber: '',
      };

      // Act
      const isValid = await wrapper.vm.validatePersonalData();

      // Assert
      expect(isValid).toBe(false);
      expect(wrapper.vm.errors.personalData.name).toBe('Name is required');
      expect(wrapper.vm.errors.personalData.lastName).toBe('Last name is required');
      expect(wrapper.vm.errors.personalData.idNumber).toBe('ID number is required');
    });

    it('should validate ID number format', async () => {
      // Arrange
      wrapper.vm.patientHistory.personalData.idNumber = 'invalid-id';

      // Act
      const isValid = await wrapper.vm.validatePersonalData();

      // Assert
      expect(isValid).toBe(false);
      expect(wrapper.vm.errors.personalData.idNumber).toBe('Invalid ID number format');
    });

    it('should validate phone number format', async () => {
      // Arrange
      wrapper.vm.patientHistory.personalData.phone = 'invalid-phone';

      // Act
      const isValid = await wrapper.vm.validatePersonalData();

      // Assert
      expect(isValid).toBe(false);
      expect(wrapper.vm.errors.personalData.phone).toBe('Invalid phone number format');
    });

    it('should validate age range', async () => {
      // Arrange
      wrapper.vm.patientHistory.personalData.age = -1;

      // Act
      const isValid = await wrapper.vm.validatePersonalData();

      // Assert
      expect(isValid).toBe(false);
      expect(wrapper.vm.errors.personalData.age).toBe('Age must be between 0 and 150');
    });

    it('should clear validation errors when fields are corrected', async () => {
      // Arrange
      wrapper.vm.errors.personalData = { name: 'Name is required' };

      // Act
      wrapper.vm.patientHistory.personalData.name = 'John';
      await wrapper.vm.clearFieldError('personalData', 'name');

      // Assert
      expect(wrapper.vm.errors.personalData.name).toBeUndefined();
    });
  });

  describe('Data Integrity', () => {
    beforeEach(async () => {
      patientHistoryService.getPatientHistoryByCommerceIdAndClientId.mockResolvedValue([
        mockPatientHistory,
      ]);

      wrapper = mount(PatientHistoryManagement, {
        props: mockProps,
        global: {
          plugins: [pinia],
        },
      });

      await flushPromises();
    });

    it('should preserve data structure when updating', async () => {
      // Arrange
      const originalStructure = JSON.parse(JSON.stringify(wrapper.vm.patientHistory));

      // Act
      wrapper.vm.patientHistory.personalData.name = 'Updated Name';
      await wrapper.vm.savePatientHistory();

      // Assert
      expect(Object.keys(wrapper.vm.patientHistory)).toEqual(Object.keys(originalStructure));
      expect(wrapper.vm.patientHistory.personalData.name).toBe('Updated Name');
      expect(wrapper.vm.patientHistory.id).toBe(originalStructure.id);
    });

    it('should handle nested object updates correctly', async () => {
      // Act
      wrapper.vm.updateNestedField('personalData', 'name', 'New Name');
      wrapper.vm.updateNestedField('personalData', 'phone', '+9876543210');

      // Assert
      expect(wrapper.vm.patientHistory.personalData.name).toBe('New Name');
      expect(wrapper.vm.patientHistory.personalData.phone).toBe('+9876543210');
      expect(wrapper.vm.patientHistory.personalData.lastName).toBe(
        mockPatientHistory.personalData.lastName,
      );
    });

    it('should handle array field updates correctly', async () => {
      // Arrange
      const newConsultationReason = {
        reason: 'New consultation reason',
        attentionId: mockProps.attentionId,
        createdAt: new Date(),
        createdBy: 'test-user',
      };

      // Act
      wrapper.vm.addConsultationReason(newConsultationReason);

      // Assert
      expect(wrapper.vm.patientHistory.consultationReason).toHaveLength(1);
      expect(wrapper.vm.patientHistory.consultationReason[0]).toEqual(newConsultationReason);
    });

    it('should maintain referential integrity with attention ID', () => {
      // Assert
      expect(wrapper.vm.patientHistory.lastAttentionId).toBe(mockProps.attentionId);

      // Act - Update attention ID
      wrapper.vm.updateAttentionId('new-attention-id');

      // Assert
      expect(wrapper.vm.patientHistory.lastAttentionId).toBe('new-attention-id');
    });
  });

  describe('Component State Management', () => {
    it('should handle read-only mode correctly', async () => {
      // Arrange
      const readOnlyProps = { ...mockProps, isEditable: false };
      patientHistoryService.getPatientHistoryByCommerceIdAndClientId.mockResolvedValue([
        mockPatientHistory,
      ]);

      // Act
      wrapper = mount(PatientHistoryManagement, {
        props: readOnlyProps,
        global: {
          plugins: [pinia],
        },
      });

      await flushPromises();

      // Assert
      expect(wrapper.vm.isEditable).toBe(false);
      expect(wrapper.find('[data-testid="save-button"]').exists()).toBe(false);
      expect(wrapper.findAll('input[readonly]').length).toBeGreaterThan(0);
    });

    it('should emit events correctly', async () => {
      // Arrange
      patientHistoryService.getPatientHistoryByCommerceIdAndClientId.mockResolvedValue([
        mockPatientHistory,
      ]);

      wrapper = mount(PatientHistoryManagement, {
        props: mockProps,
        global: {
          plugins: [pinia],
        },
      });

      await flushPromises();

      // Act
      await wrapper.vm.savePatientHistory();

      // Assert
      expect(wrapper.emitted('patient-history-saved')).toBeTruthy();
      expect(wrapper.emitted('patient-history-saved')[0][0]).toEqual(mockPatientHistory);
    });

    it('should handle prop changes reactively', async () => {
      // Arrange
      patientHistoryService.getPatientHistoryByCommerceIdAndClientId.mockResolvedValue([
        mockPatientHistory,
      ]);

      wrapper = mount(PatientHistoryManagement, {
        props: mockProps,
        global: {
          plugins: [pinia],
        },
      });

      await flushPromises();
      vi.clearAllMocks();

      // Act
      await wrapper.setProps({ clientId: 'new-client-id' });

      // Assert
      expect(patientHistoryService.getPatientHistoryByCommerceIdAndClientId).toHaveBeenCalledWith(
        mockProps.commerceId,
        'new-client-id',
      );
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after load failure', async () => {
      // Arrange
      patientHistoryService.getPatientHistoryByCommerceIdAndClientId
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([mockPatientHistory]);

      wrapper = mount(PatientHistoryManagement, {
        props: mockProps,
        global: {
          plugins: [pinia],
        },
      });

      await flushPromises();

      // Assert initial error state
      expect(wrapper.vm.errors.loading).toBeDefined();

      // Act - Retry loading
      await wrapper.vm.loadPatientHistory();

      // Assert - Should recover successfully
      expect(wrapper.vm.errors.loading).toBeUndefined();
      expect(wrapper.vm.patientHistory).toEqual(mockPatientHistory);
    });

    it('should allow retry after save failure', async () => {
      // Arrange
      patientHistoryService.getPatientHistoryByCommerceIdAndClientId.mockResolvedValue([
        mockPatientHistory,
      ]);

      wrapper = mount(PatientHistoryManagement, {
        props: mockProps,
        global: {
          plugins: [pinia],
        },
      });

      await flushPromises();

      patientHistoryService.savePatientHistory
        .mockRejectedValueOnce(new Error('Save failed'))
        .mockResolvedValueOnce(mockPatientHistory);

      // Act - First save attempt fails
      await wrapper.vm.savePatientHistory();
      expect(wrapper.vm.errors.saving).toBeDefined();

      // Act - Retry save
      await wrapper.vm.savePatientHistory();

      // Assert - Should recover successfully
      expect(wrapper.vm.errors.saving).toBeUndefined();
    });
  });
});
