import { requestBackend, getHeaders } from '../api';

export const createBooking = async (body) => {
  return (await requestBackend.post(`/booking`, body, await getHeaders())).data;
}

export const getBookingByDate = async (queueId, date) => {
  return (await requestBackend.get(`/booking/queue/${queueId}/date/${date}`, await getHeaders())).data;
}

export const getBookingById = async (id) => {
  return (await requestBackend.get(`/booking/${id}`, await getHeaders())).data;
}

export const getBookingDetails = async (id) => {
  return (await requestBackend.get(`/booking/details/${id}`, await getHeaders())).data;
}

export const cancelBooking = async (id) => {
  return (await requestBackend.patch(`/booking/cancel/${id}`, {}, await getHeaders())).data;
}

