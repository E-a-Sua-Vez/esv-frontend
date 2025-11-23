import { requestBackend, getHeaders } from '../api';

export const getPlans = async () => (await requestBackend.get('/plan', await getHeaders())).data;

export const getPlanById = async id =>
  (await requestBackend.get(`/plan/${id}`, await getHeaders())).data;

export const updatePlanPermission = async (id, permission) =>
  (await requestBackend.patch(`/plan/${id}/permission`, permission, await getHeaders())).data;

export const addPlan = async plan =>
  (await requestBackend.post('/plan', plan, await getHeaders())).data;

export const updatePlan = async (id, plan) =>
  (await requestBackend.patch(`/plan/${id}`, plan, await getHeaders())).data;
