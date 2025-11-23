import { requestBackend, getHeaders } from '../api';

export const addPlanActivation = async planActivation =>
  (await requestBackend.post('/plan-activation', planActivation, await getHeaders())).data;

export const getValidatedPlanActivationByBusinessId = async (businessId, validated) =>
  (
    await requestBackend.get(
      `/plan-activation/validated/${validated}/businessId/${businessId}`,
      await getHeaders()
    )
  ).data;

export const getValidatedPlanActivation = async validated =>
  (await requestBackend.get(`/plan-activation/validated/${validated}`, await getHeaders())).data;

export const planValidate = async (id, planActivation) =>
  (
    await requestBackend.patch(
      `/plan-activation/validate/${id}`,
      planActivation,
      await getHeaders()
    )
  ).data;

export const planDesactivate = async id =>
  (await requestBackend.patch(`/plan-activation/desactivate/${id}`, await getHeaders())).data;
