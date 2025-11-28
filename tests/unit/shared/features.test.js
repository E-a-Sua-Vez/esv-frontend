/**
 * Unit tests for features.ts
 * Tests for getFeature and getActiveFeature functions with null safety
 */

import { describe, it, expect } from 'vitest';
import { getFeature, getActiveFeature } from '@/shared/features';

describe('Features Module', () => {
  describe('getFeature', () => {
    it('should return empty object when commerce is null', () => {
      const result = getFeature(null, 'test-feature');
      expect(result).toEqual({});
    });

    it('should return empty object when commerce is undefined', () => {
      const result = getFeature(undefined, 'test-feature');
      expect(result).toEqual({});
    });

    it('should return empty object when commerce.features is null', () => {
      const commerce = { features: null };
      const result = getFeature(commerce, 'test-feature');
      expect(result).toEqual({});
    });

    it('should return empty object when commerce.features is undefined', () => {
      const commerce = { features: undefined };
      const result = getFeature(commerce, 'test-feature');
      expect(result).toEqual({});
    });

    it('should return empty object when feature is not found', () => {
      const commerce = {
        features: [
          { name: 'feature-1', active: true },
          { name: 'feature-2', active: false },
        ],
      };
      const result = getFeature(commerce, 'non-existent-feature');
      expect(result).toEqual({});
    });

    it('should return feature when found', () => {
      const commerce = {
        features: [
          { name: 'feature-1', active: true },
          { name: 'feature-2', active: false },
        ],
      };
      const result = getFeature(commerce, 'feature-1');
      expect(result).toEqual({ name: 'feature-1', active: true });
    });

    it('should return empty object when features array is empty', () => {
      const commerce = { features: [] };
      const result = getFeature(commerce, 'test-feature');
      expect(result).toEqual({});
    });
  });

  describe('getActiveFeature', () => {
    it('should return false when commerce is null', () => {
      const result = getActiveFeature(null, 'test-feature', 'PRODUCT');
      expect(result).toBe(false);
    });

    it('should return false when commerce is undefined', () => {
      const result = getActiveFeature(undefined, 'test-feature', 'PRODUCT');
      expect(result).toBe(false);
    });

    it('should return false when commerce.features is null', () => {
      const commerce = { features: null };
      const result = getActiveFeature(commerce, 'test-feature', 'PRODUCT');
      expect(result).toBe(false);
    });

    it('should return false when commerce.features is undefined', () => {
      const commerce = { features: undefined };
      const result = getActiveFeature(commerce, 'test-feature', 'PRODUCT');
      expect(result).toBe(false);
    });

    it('should return false when commerce.features is empty array', () => {
      const commerce = { features: [] };
      const result = getActiveFeature(commerce, 'test-feature', 'PRODUCT');
      expect(result).toBe(false);
    });

    it('should return false when feature is not found', () => {
      const commerce = {
        features: [
          { name: 'other-feature', type: 'PRODUCT', active: true },
          { name: 'test-feature', type: 'USER', active: true },
        ],
      };
      const result = getActiveFeature(commerce, 'test-feature', 'PRODUCT');
      expect(result).toBe(false);
    });

    it('should return false when feature is found but inactive', () => {
      const commerce = {
        features: [{ name: 'test-feature', type: 'PRODUCT', active: false }],
      };
      const result = getActiveFeature(commerce, 'test-feature', 'PRODUCT');
      expect(result).toBe(false);
    });

    it('should return true when feature is found and active', () => {
      const commerce = {
        features: [{ name: 'test-feature', type: 'PRODUCT', active: true }],
      };
      const result = getActiveFeature(commerce, 'test-feature', 'PRODUCT');
      expect(result).toBe(true);
    });

    it('should return true when multiple features exist and matching one is active', () => {
      const commerce = {
        features: [
          { name: 'feature-1', type: 'PRODUCT', active: false },
          { name: 'test-feature', type: 'PRODUCT', active: true },
          { name: 'test-feature', type: 'USER', active: false },
        ],
      };
      const result = getActiveFeature(commerce, 'test-feature', 'PRODUCT');
      expect(result).toBe(true);
    });

    it('should handle different feature types correctly', () => {
      const commerce = {
        features: [
          { name: 'same-name', type: 'PRODUCT', active: true },
          { name: 'same-name', type: 'USER', active: false },
        ],
      };
      const productResult = getActiveFeature(commerce, 'same-name', 'PRODUCT');
      const userResult = getActiveFeature(commerce, 'same-name', 'USER');
      expect(productResult).toBe(true);
      expect(userResult).toBe(false);
    });

    it('should return false when commerce object exists but has no features property', () => {
      const commerce = {};
      const result = getActiveFeature(commerce, 'test-feature', 'PRODUCT');
      expect(result).toBe(false);
    });
  });
});



