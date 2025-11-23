/**
 * Unit tests for booking.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bookingModule from '@/application/services/booking';
import { requestBackend, getHeaders } from '@/application/api';

// Mock the API module
vi.mock('@/application/api', () => ({
  requestBackend: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  getHeaders: vi.fn(() => Promise.resolve({ headers: {} })),
}));

describe('Booking Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBooking', () => {
    it('should create a new booking', async () => {
      const body = { queueId: 'queue-123', date: '2024-01-01' };
      const mockCreated = { id: 'booking-456', ...body };
      requestBackend.post.mockResolvedValue({ data: mockCreated });

      const result = await bookingModule.createBooking(body);

      expect(requestBackend.post).toHaveBeenCalledWith('/booking', body, await getHeaders());
      expect(result).toEqual(mockCreated);
    });
  });

  describe('getBookingByDate', () => {
    it('should fetch bookings by queue ID and date', async () => {
      const mockBookings = [{ id: '1', number: 1 }];
      requestBackend.get.mockResolvedValue({ data: mockBookings });

      const result = await bookingModule.getBookingByDate('queue-123', '2024-01-01');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/booking/queue/queue-123/date/2024-01-01',
        await getHeaders()
      );
      expect(result).toEqual(mockBookings);
    });
  });

  describe('getBookingById', () => {
    it('should fetch a booking by ID', async () => {
      const mockBooking = { id: 'booking-123', number: 1 };
      requestBackend.get.mockResolvedValue({ data: mockBooking });

      const result = await bookingModule.getBookingById('booking-123');

      expect(requestBackend.get).toHaveBeenCalledWith('/booking/booking-123', await getHeaders());
      expect(result).toEqual(mockBooking);
    });
  });

  describe('getBookingDetails', () => {
    it('should fetch booking details by ID', async () => {
      const mockDetails = { id: 'booking-123', queue: {}, commerce: {} };
      requestBackend.get.mockResolvedValue({ data: mockDetails });

      const result = await bookingModule.getBookingDetails('booking-123');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/booking/details/booking-123',
        await getHeaders()
      );
      expect(result).toEqual(mockDetails);
    });
  });

  describe('cancelBooking', () => {
    it('should cancel a booking', async () => {
      const mockCancelled = { id: 'booking-123', status: 'CANCELLED' };
      requestBackend.patch.mockResolvedValue({ data: mockCancelled });

      const result = await bookingModule.cancelBooking('booking-123');

      expect(requestBackend.patch).toHaveBeenCalledWith(
        '/booking/cancel/booking-123',
        {},
        await getHeaders()
      );
      expect(result).toEqual(mockCancelled);
    });
  });

  describe('confirmBooking', () => {
    it('should confirm a booking', async () => {
      const body = { confirmed: true };
      const mockConfirmed = { id: 'booking-123', status: 'CONFIRMED' };
      requestBackend.patch.mockResolvedValue({ data: mockConfirmed });

      const result = await bookingModule.confirmBooking('booking-123', body);

      expect(requestBackend.patch).toHaveBeenCalledWith(
        '/booking/confirm/booking-123',
        body,
        await getHeaders()
      );
      expect(result).toEqual(mockConfirmed);
    });
  });

  describe('getPendingBookingsBetweenDates', () => {
    it('should fetch pending bookings between dates', async () => {
      const mockBookings = [{ id: '1', status: 'PENDING' }];
      requestBackend.get.mockResolvedValue({ data: mockBookings });

      const result = await bookingModule.getPendingBookingsBetweenDates(
        'queue-123',
        '2024-01-01',
        '2024-01-31'
      );

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/booking/pending/queue/queue-123/from/2024-01-01/to/2024-01-31',
        await getHeaders()
      );
      expect(result).toEqual(mockBookings);
    });

    it('should return undefined if parameters are missing', async () => {
      const result = await bookingModule.getPendingBookingsBetweenDates(
        null,
        '2024-01-01',
        '2024-01-31',
      );
      expect(result).toBeUndefined();
      expect(requestBackend.get).not.toHaveBeenCalled();
    });
  });
});
