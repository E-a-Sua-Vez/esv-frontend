import { requestBackend, requestQuery, getHeaders } from '../api';

const entity = 'patient-history';

export const getPatientHistoryDetails = async filterDto => {
  const params = new URLSearchParams();
  if (filterDto.id) params.append('id', filterDto.id);
  if (filterDto.commerceId) params.append('commerceId', filterDto.commerceId);
  if (filterDto.clientId) params.append('clientId', filterDto.clientId);
  if (filterDto.type) params.append('type', filterDto.type);
  if (filterDto.date) params.append('date', filterDto.date);
  if (filterDto.from) params.append('from', filterDto.from);
  if (filterDto.to) params.append('to', filterDto.to);
  if (filterDto.page) params.append('page', filterDto.page);
  if (filterDto.limit) params.append('limit', filterDto.limit);
  if (filterDto.idNumber) params.append('idNumber', filterDto.idNumber);

  return (await requestQuery.get(`/${entity}/details?${params}`, await getHeaders())).data;
};

export const advancedSearch = async searchDto => {
  const params = new URLSearchParams();
  if (searchDto.clientId) params.append('clientId', searchDto.clientId);
  if (searchDto.commerceId) params.append('commerceId', searchDto.commerceId);
  if (searchDto.searchText) params.append('searchText', searchDto.searchText);
  if (searchDto.itemType) params.append('itemType', searchDto.itemType);
  if (searchDto.cie10Code) params.append('cie10Code', searchDto.cie10Code);
  if (searchDto.doctorId) params.append('doctorId', searchDto.doctorId);
  if (searchDto.doctorName) params.append('doctorName', searchDto.doctorName);
  if (searchDto.dateFrom) params.append('dateFrom', searchDto.dateFrom);
  if (searchDto.dateTo) params.append('dateTo', searchDto.dateTo);
  if (searchDto.tags) {
    searchDto.tags.forEach(tag => params.append('tags', tag));
  }
  if (searchDto.favoritesOnly) params.append('favoritesOnly', searchDto.favoritesOnly);
  if (searchDto.confirmedDiagnosticsOnly)
    params.append('confirmedDiagnosticsOnly', searchDto.confirmedDiagnosticsOnly);
  if (searchDto.page) params.append('page', searchDto.page);
  if (searchDto.limit) params.append('limit', searchDto.limit);
  if (searchDto.sortBy) params.append('sortBy', searchDto.sortBy);
  if (searchDto.sortOrder) params.append('sortOrder', searchDto.sortOrder);

  return (await requestQuery.get(`/${entity}/advanced-search?${params}`, await getHeaders())).data;
};

export const savePatientHistory = async body =>
  (await requestBackend.post(`/${entity}/save`, body, await getHeaders())).data;

export const updatePatientHistoryControl = async (id, body) =>
  (await requestBackend.patch(`/${entity}/control/${id}`, body, await getHeaders())).data;

// Consultation History endpoints
export const getConsultationByAttentionId = async attentionId =>
  (await requestBackend.get(`/${entity}/consultation/${attentionId}`, await getHeaders())).data;

export const getConsultationsByPatientHistoryId = async patientHistoryId =>
  (
    await requestBackend.get(
      `/${entity}/consultations/patient/${patientHistoryId}`,
      await getHeaders()
    )
  ).data;

export const getConsultationsByClientId = async (commerceId, clientId) =>
  (
    await requestBackend.get(
      `/${entity}/consultations/client/${commerceId}/${clientId}`,
      await getHeaders()
    )
  ).data;

// Patient Journey endpoints
export const getPatientJourney = async (commerceId, clientId) =>
  (await requestBackend.get(`/${entity}/journey/${commerceId}/${clientId}`, await getHeaders()))
    .data;

export const getPatientJourneyByAttention = async attentionId =>
  (await requestBackend.get(`/${entity}/journey/attention/${attentionId}`, await getHeaders()))
    .data;
