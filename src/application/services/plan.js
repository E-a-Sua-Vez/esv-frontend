import { requestBackend, getHeaders } from '../api';

export const getPlans = async () => {
  return (await requestBackend.get(`/plan`, await getHeaders())).data;
}

export const getPlanById = async (id) => {
  return (await requestBackend.get(`/plan/${id}`, await getHeaders())).data;
}

export const updatePlanPermission = async (id, permission) => {
  return (await requestBackend.patch(`/plan/${id}/permission`, permission, await getHeaders())).data;
}

export const addPlan = async (plan) => {
  return (await requestBackend.post(`/plan`, plan, await getHeaders())).data;
}

export const updatePlan = async (id, plan) => {
  return (await requestBackend.patch(`/plan/${id}`, plan, await getHeaders())).data;
}