/**
 * Application Constants
 * Centralized constants to avoid magic strings and numbers
 */

// Session timeouts
export const SESSION_TIMEOUT_DAYS = 1;
export const INVITED_SESSION_TIMEOUT_HOURS = 6;

// User types
export const USER_TYPES = {
  BUSINESS: 'business',
  COLLABORATOR: 'collaborator',
  MASTER: 'master',
  INVITED: 'invited',
};

// Attention statuses
export const ATTENTION_STATUS = {
  PENDING: 'PENDING',
  TERMINATED: 'TERMINATED',
  RATED: 'RATED',
  PROCESSING: 'PROCESSING',
  CANCELLED: 'CANCELLED',
  REACTIVATED: 'REACTIVATED',
  SKIPED: 'SKIPED',
  TERMINATED_RESERVE_CANCELLED: 'TERMINATED_RESERVE_CANCELLED',
  USER_CANCELLED: 'USER_CANCELLED',
};

// Booking statuses
export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
};

// Storage keys
export const STORAGE_KEYS = {
  CURRENT_USER: 'currentUser',
  CURRENT_PERMISSIONS: 'currentPermissions',
  CURRENT_QUEUE: 'currentQueue',
  CURRENT_USER_TYPE: 'currentUserType',
  CURRENT_COMMERCE: 'currentCommerce',
  CURRENT_BUSINESS: 'currentBusiness',
  CURRENT_ATTENTION_CHANNEL: 'currentAttentionChannel',
  CURRENT_ACTIVE_ATTENTIONS: 'currentActiveAttentions',
};

// Default values
export const DEFAULTS = {
  ATTENTION_CHANNEL: 'QR',
};

// Environment
export const ENVIRONMENTS = {
  LOCAL: 'local',
  PRODUCTION: 'prod',
  TEST: 'test',
};
// test comment
