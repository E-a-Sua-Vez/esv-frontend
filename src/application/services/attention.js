import { requestBackend, getHeaders } from '../api';

const entity = 'attention';

export const createAttention = async body =>
  (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;

export const getAttentionByDate = async (queueId, date) =>
  (await requestBackend.get(`/${entity}/queue/${queueId}/date/${date}`, await getHeaders())).data;

export const getAttentionDetails = async id =>
  (await requestBackend.get(`/${entity}/details/${id}`, await getHeaders())).data;

export const getAttentionDetailsByNumber = async (queueId, number, status) =>
  (
    await requestBackend.get(
      `/${entity}/details/queue/${queueId}/number/${number}/status/${status}`,
      await getHeaders()
    )
  ).data;

export const getAvailableAttentionDetailsByNumber = async (queueId, number) =>
  (
    await requestBackend.get(
      `/${entity}/available/details/queue/${queueId}/number/${number}`,
      await getHeaders()
    )
  ).data;

export const getNextAvailableAttentionDetails = async queueId =>
  (
    await requestBackend.get(
      `/${entity}/next/available/details/queue/${queueId}`,
      await getHeaders()
    )
  ).data;

export const getAttentionDetailsByQueue = async (queueId, status) =>
  (
    await requestBackend.get(
      `/${entity}/details/queue/${queueId}/status/${status}`,
      await getHeaders()
    )
  ).data;

export const getProcessingAttentionDetailsByQueue = async queueId =>
  (await requestBackend.get(`/${entity}/processing/details/queue/${queueId}`, await getHeaders()))
    .data;

export const getAvailableAttentiosnByQueue = async queueId =>
  (await requestBackend.get(`/${entity}/available/details/queue/${queueId}`, await getHeaders()))
    .data;

export const getAttentionById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const finishAttention = async (id, body) =>
  (await requestBackend.patch(`/${entity}/finish/${id}`, body, await getHeaders())).data;

export const finishCancelledAttention = async (id, body) =>
  (await requestBackend.patch(`/${entity}/finish-cancelled/${id}`, body, await getHeaders())).data;

export const setNoDevice = async (id, body) =>
  (await requestBackend.patch(`/${entity}/no-device/${id}`, body, await getHeaders())).data;

export const attend = async (number, body) =>
  (await requestBackend.patch(`/${entity}/${number}`, body, await getHeaders())).data;

export const skip = async (id, body) =>
  (await requestBackend.patch(`/${entity}/skip/${id}`, body, await getHeaders())).data;

export const reactivate = async (number, body) =>
  (await requestBackend.patch(`/${entity}/reactivate/${number}`, body, await getHeaders())).data;

export const notify = async (id, body) =>
  (await requestBackend.patch(`/${entity}/notification/${id}`, body, await getHeaders())).data;

export const cancelAttention = async id =>
  (await requestBackend.patch(`/${entity}/cancel/${id}`, {}, await getHeaders())).data;

export const attentionPaymentConfirm = async (id, body) =>
  (await requestBackend.patch(`/${entity}/payment-confirm/${id}`, body, await getHeaders())).data;

export const transferAttention = async (id, body) =>
  (await requestBackend.patch(`/${entity}/transfer/${id}`, body, await getHeaders())).data;

export const getPendingCommerceAttentions = async commerceId =>
  (await requestBackend.get(`/${entity}/pending/commerce/${commerceId}`, await getHeaders())).data;
