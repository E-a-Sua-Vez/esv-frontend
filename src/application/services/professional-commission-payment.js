import { requestBackend, requestQueryStack, getHeaders } from '../api';

const entity = 'professional-commission-payment';
const queryEntity = 'professional-commission-payments';

export const getCommissionPaymentById = async id =>
  (await requestQueryStack.get(`/${queryEntity}/${id}`, await getHeaders())).data;

export const getCommissionPaymentsByCommerce = async commerceId =>
  (await requestQueryStack.get(`/${queryEntity}/commerce/${commerceId}`, await getHeaders())).data;

export const getCommissionPaymentsByProfessional = async professionalId =>
  (
    await requestQueryStack.get(
      `/${queryEntity}/professional/${professionalId}`,
      await getHeaders(),
    )
  ).data;

export const getCommissionPaymentsByStatus = async (commerceId, status) =>
  (
    await requestQueryStack.get(
      `/${queryEntity}/commerce/${commerceId}/status/${status}`,
      await getHeaders(),
    )
  ).data;

export const getCommissionPaymentsByProfessionalAndStatus = async (
  professionalId,
  commerceId,
  status,
) =>
  (
    await requestQueryStack.get(
      `/${queryEntity}/professional/${professionalId}/commerce/${commerceId}/status/${status}`,
      await getHeaders(),
    )
  ).data;

export const getUnpaidIncomesByProfessional = async (professionalId, commerceId, from, to) => {
  const params = new URLSearchParams({ commerceId });
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  return (
    await requestBackend.get(
      `/${entity}/unpaid/professional/${professionalId}?${params}`,
      await getHeaders(),
    )
  ).data;
};

export const createCommissionPayment = async (
  commerceId,
  businessId,
  professionalId,
  incomeIds,
  periodFrom,
  periodTo,
  notes,
) =>
  (
    await requestBackend.post(
      `/${entity}`,
      {
        commerceId,
        businessId,
        professionalId,
        incomeIds,
        periodFrom,
        periodTo,
        notes,
      },
      await getHeaders(),
    )
  ).data;

export const updateCommissionPayment = async (id, incomeIdsToAdd, incomeIdsToRemove, notes) =>
  (
    await requestBackend.patch(
      `/${entity}/${id}`,
      {
        incomeIdsToAdd,
        incomeIdsToRemove,
        notes,
      },
      await getHeaders(),
    )
  ).data;

export const confirmCommissionPayment = async (id, paymentMethod, paymentNotes) =>
  (
    await requestBackend.post(
      `/${entity}/${id}/confirm`,
      {
        paymentMethod,
        paymentNotes,
      },
      await getHeaders(),
    )
  ).data;

export const cancelCommissionPayment = async (id, reason) =>
  (
    await requestBackend.post(
      `/${entity}/${id}/cancel`,
      {
        reason,
      },
      await getHeaders(),
    )
  ).data;
