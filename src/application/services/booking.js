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

