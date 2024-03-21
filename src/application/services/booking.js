import { requestBackend, getHeaders } from '../api';

const entity = 'booking';

export const createBooking = async (body) => {
  return (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;
}

export const getBookingByDate = async (queueId, date) => {
  return (await requestBackend.get(`/${entity}/queue/${queueId}/date/${date}`, await getHeaders())).data;
}

export const getBookingById = async (id) => {
  return (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;
}

export const getBookingDetails = async (id) => {
  return (await requestBackend.get(`/${entity}/details/${id}`, await getHeaders())).data;
}

export const cancelBooking = async (id) => {
  return (await requestBackend.patch(`/${entity}/cancel/${id}`, {}, await getHeaders())).data;
}

export const createBookingFromWaitlist = async (id, number) => {
  return (await requestBackend.post(`/${entity}/waitlist/${id}/block/${number}`, {}, await getHeaders())).data;
}

export const getPendingBookingsBetweenDates = async (queueId, dateFrom, dateTo) => {
  return (await requestBackend.get(`/${entity}/pending/queue/${queueId}/from/${dateFrom}/to/${dateTo}`, await getHeaders())).data;
}

export const getPendingCommerceBookingsBetweenDates = async (commerceId, date) => {
  return (await requestBackend.get(`/${entity}/pending/commerce/${commerceId}/${date}`, await getHeaders())).data;
}

export const confirmBooking = async (id, body) => {
  return (await requestBackend.patch(`/${entity}/confirm/${id}`, body, await getHeaders())).data;
}

export const transferBooking = async (id, body) => {
  return (await requestBackend.patch(`/${entity}/transfer/${id}`, body, await getHeaders())).data;
}