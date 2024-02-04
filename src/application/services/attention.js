import { requestBackend, getHeaders } from '../api';

export const createAttention = async (body) => {
  return (await requestBackend.post(`/attention`, body, await getHeaders())).data;
}

export const getAttentionDetails = async (id) => {
  return (await requestBackend.get(`/attention/details/${id}`, await getHeaders())).data;
}

export const getAttentionDetailsByNumber = async (queueId, number, status) => {
  return (await requestBackend.get(`/attention/details/queue/${queueId}/number/${number}/status/${status}`, await getHeaders())).data;
}

export const getAvailableAttentionDetailsByNumber = async (queueId, number) => {
  return (await requestBackend.get(`/attention/available/details/queue/${queueId}/number/${number}`, await getHeaders())).data;
}

export const getAttentionDetailsByQueue = async (queueId, status) => {
  return (await requestBackend.get(`/attention/details/queue/${queueId}/status/${status}`, await getHeaders())).data;
}

export const getAvailableAttentiosnByQueue = async (queueId) => {
  return (await requestBackend.get(`/attention/available/details/queue/${queueId}`, await getHeaders())).data;
}

export const getAttentionById = async (id) => {
  return (await requestBackend.get(`/attention/${id}`, await getHeaders())).data;
}

export const finishAttention = async (id, body) => {
  return (await requestBackend.patch(`/attention/finish/${id}`, body, await getHeaders())).data;
}

export const finishCancelledAttention = async (id, body) => {
  return (await requestBackend.patch(`/attention/finish-cancelled/${id}`, body, await getHeaders())).data;
}

export const setNoDevice = async (id, body) => {
  return (await requestBackend.patch(`/attention/no-device/${id}`, body, await getHeaders())).data;
}

export const attend = async (number, body) => {
  return (await requestBackend.patch(`/attention/${number}`, body, await getHeaders())).data;
}

export const skip = async (id, body) => {
  return (await requestBackend.patch(`/attention/skip/${id}`, body, await getHeaders())).data;
}

export const reactivate = async (number, body) => {
  return (await requestBackend.patch(`/attention/reactivate/${number}`, body, await getHeaders())).data;
}

export const notify = async (id, body) => {
  return (await requestBackend.patch(`/attention/notification/${id}`, body, await getHeaders())).data;
}

export const cancelAttention = async (id, body) => {
  return (await requestBackend.patch(`/attention/cancel/${id}`, body, await getHeaders())).data;
}