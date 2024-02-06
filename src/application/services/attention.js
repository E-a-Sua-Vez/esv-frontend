import { requestBackend, getHeaders } from '../api';

const entity = 'attention';

export const createAttention = async (body) => {
  return (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;
}

export const getAttentionDetails = async (id) => {
  return (await requestBackend.get(`/${entity}/details/${id}`, await getHeaders())).data;
}

export const getAttentionDetailsByNumber = async (queueId, number, status) => {
  return (await requestBackend.get(`/${entity}/details/queue/${queueId}/number/${number}/status/${status}`, await getHeaders())).data;
}

export const getAvailableAttentionDetailsByNumber = async (queueId, number) => {
  return (await requestBackend.get(`/${entity}/available/details/queue/${queueId}/number/${number}`, await getHeaders())).data;
}

export const getNextAvailableAttentionDetails = async (queueId) => {
  return (await requestBackend.get(`/${entity}/next/available/details/queue/${queueId}`, await getHeaders())).data;
}

export const getAttentionDetailsByQueue = async (queueId, status) => {
  return (await requestBackend.get(`/${entity}/details/queue/${queueId}/status/${status}`, await getHeaders())).data;
}

export const getAvailableAttentiosnByQueue = async (queueId) => {
  return (await requestBackend.get(`/${entity}/available/details/queue/${queueId}`, await getHeaders())).data;
}

export const getAttentionById = async (id) => {
  return (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;
}

export const finishAttention = async (id, body) => {
  return (await requestBackend.patch(`/${entity}/finish/${id}`, body, await getHeaders())).data;
}

export const finishCancelledAttention = async (id, body) => {
  return (await requestBackend.patch(`/${entity}/finish-cancelled/${id}`, body, await getHeaders())).data;
}

export const setNoDevice = async (id, body) => {
  return (await requestBackend.patch(`/${entity}/no-device/${id}`, body, await getHeaders())).data;
}

export const attend = async (number, body) => {
  return (await requestBackend.patch(`/${entity}/${number}`, body, await getHeaders())).data;
}

export const skip = async (id, body) => {
  return (await requestBackend.patch(`/${entity}/skip/${id}`, body, await getHeaders())).data;
}

export const reactivate = async (number, body) => {
  return (await requestBackend.patch(`/${entity}/reactivate/${number}`, body, await getHeaders())).data;
}

export const notify = async (id, body) => {
  return (await requestBackend.patch(`/${entity}/notification/${id}`, body, await getHeaders())).data;
}

export const cancelAttention = async (id, body) => {
  return (await requestBackend.patch(`/${entity}/cancel/${id}`, body, await getHeaders())).data;
}