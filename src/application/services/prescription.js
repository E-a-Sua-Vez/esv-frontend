import { requestBackend, getHeaders } from '../api';

const entity = 'prescription';

export const createPrescription = async body =>
  (await requestBackend.post(`/${entity}/`, body, await getHeaders())).data;

export const getPrescriptionById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const getPrescriptionsByClient = async (commerceId, clientId) =>
  (await requestBackend.get(`/${entity}/client/${commerceId}/${clientId}`, await getHeaders()))
    .data;

export const getActivePrescriptionsByClient = async (commerceId, clientId) =>
  (
    await requestBackend.get(
      `/${entity}/client/${commerceId}/${clientId}/active`,
      await getHeaders()
    )
  ).data;

export const refillPrescription = async (id, medicationIndex) => {
  const params = medicationIndex !== undefined ? `?medicationIndex=${medicationIndex}` : '';
  return (await requestBackend.post(`/${entity}/${id}/refill${params}`, {}, await getHeaders()))
    .data;
};

export const recordDispensation = async (id, dispensationData) =>
  (await requestBackend.post(`/${entity}/${id}/dispensation`, dispensationData, await getHeaders()))
    .data;

export const cancelPrescription = async (id, reason) =>
  (await requestBackend.patch(`/${entity}/${id}/cancel`, { reason }, await getHeaders())).data;

export const searchMedications = async searchDto => {
  const params = new URLSearchParams();
  if (searchDto.searchTerm) params.append('searchTerm', searchDto.searchTerm);
  if (searchDto.atcCode) params.append('atcCode', searchDto.atcCode);
  if (searchDto.activePrinciple) params.append('activePrinciple', searchDto.activePrinciple);
  if (searchDto.page) params.append('page', searchDto.page);
  if (searchDto.limit) params.append('limit', searchDto.limit);
  return (await requestBackend.get(`/${entity}/medications/search?${params}`, await getHeaders()))
    .data;
};

export const getMedicationById = async id =>
  (await requestBackend.get(`/${entity}/medications/${id}`, await getHeaders())).data;

export const validateMedicationInteractions = async medicationIds =>
  (
    await requestBackend.post(
      `/${entity}/validate-interactions`,
      { medicationIds },
      await getHeaders()
    )
  ).data;

export const downloadPrescriptionPdf = async id => {
  const response = await requestBackend.get(`/${entity}/${id}/pdf`, {
    ...(await getHeaders()),
    responseType: 'blob',
  });
  return response.data;
};

export const getPrescriptionPdfUrl = async (id, expiresIn = 3600) => {
  const params = expiresIn ? `?expiresIn=${expiresIn}` : '';
  return (await requestBackend.get(`/${entity}/${id}/pdf-url${params}`, await getHeaders())).data;
};

export const getPrescriptionSuggestionsForAttention = async (commerceId, clientId, attentionId) =>
  (
    await requestBackend.get(
      `/${entity}/suggestions/attention/${commerceId}/${clientId}/${attentionId}`,
      await getHeaders()
    )
  ).data;
