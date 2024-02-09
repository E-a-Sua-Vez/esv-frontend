import { requestBackend, getHeaders } from '../api';

const entity = 'waitlist';

export const createWaitlist = async (body) => {
  return (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;
}

export const getWaitlistByDate = async (queueId, date) => {
  return (await requestBackend.get(`/${entity}/queue/${queueId}/date/${date}`, await getHeaders())).data;
}

export const getWaitlistById = async (id) => {
  return (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;
}

export const getWaitlistDetails = async (id) => {
  return (await requestBackend.get(`/${entity}/details/${id}`, await getHeaders())).data;
}

export const cancelWaitlist = async (id) => {
  return (await requestBackend.patch(`/${entity}/cancel/${id}`, {}, await getHeaders())).data;
}

