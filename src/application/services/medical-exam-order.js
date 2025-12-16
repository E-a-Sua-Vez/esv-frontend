import { requestBackend, getHeaders } from '../api';

const entity = 'medical-exam-order';

export const searchExams = async searchDto => {
  const params = new URLSearchParams();
  if (searchDto.q) params.append('q', searchDto.q);
  if (searchDto.type) params.append('type', searchDto.type);
  if (searchDto.page) params.append('page', searchDto.page);
  if (searchDto.limit) params.append('limit', searchDto.limit);
  return (await requestBackend.get(`/${entity}/exams/search?${params}`, await getHeaders())).data;
};

export const createExamOrder = async orderData =>
  (await requestBackend.post(`/${entity}/`, orderData, await getHeaders())).data;

export const getExamOrderById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const getExamOrdersByClient = async (commerceId, clientId) =>
  (await requestBackend.get(`/${entity}/client/${commerceId}/${clientId}`, await getHeaders()))
    .data;

export const updateExamOrderStatus = async (id, status, scheduledDate) =>
  (
    await requestBackend.patch(
      `/${entity}/${id}/status`,
      { status, scheduledDate },
      await getHeaders()
    )
  ).data;

export const addExamResults = async (id, results) =>
  (await requestBackend.post(`/${entity}/${id}/results`, { results }, await getHeaders())).data;

/**
 * Crear resultado estructurado usando el nuevo servicio
 */
export const createStructuredExamResult = async resultData =>
  (await requestBackend.post('/exam-result', resultData, await getHeaders())).data;

/**
 * Comparar resultado con anteriores
 */
export const compareExamResult = async (examOrderId, resultId) =>
  (await requestBackend.get(`/exam-result/${examOrderId}/compare/${resultId}`, await getHeaders()))
    .data;

/**
 * Buscar template de resultado por código de examen
 */
export const getExamResultTemplate = async (examCode, commerceId) => {
  const params = new URLSearchParams();
  if (examCode) params.append('examCode', examCode);
  if (commerceId) params.append('commerceId', commerceId);
  const response = await requestBackend.get(`/exam-result-template?${params}`, await getHeaders());
  // Retornar el primer template si hay múltiples
  return response.data && response.data.length > 0 ? response.data[0] : null;
};

/**
 * Listar todos los templates
 */
export const listExamResultTemplates = async (commerceId, businessId) => {
  const params = new URLSearchParams();
  if (commerceId) params.append('commerceId', commerceId);
  if (businessId) params.append('businessId', businessId);
  return (await requestBackend.get(`/exam-result-template?${params}`, await getHeaders())).data;
};

/**
 * Crear template
 */
export const createExamResultTemplate = async templateData =>
  (await requestBackend.post('/exam-result-template', templateData, await getHeaders())).data;

/**
 * Actualizar template
 */
export const updateExamResultTemplate = async (id, templateData) =>
  (await requestBackend.put(`/exam-result-template/${id}`, templateData, await getHeaders())).data;

/**
 * Eliminar template
 */
export const deleteExamResultTemplate = async id =>
  (await requestBackend.delete(`/exam-result-template/${id}`, await getHeaders())).data;

/**
 * Descargar PDF de orden de examen
 */
export const downloadExamOrderPdf = async id => {
  const response = await requestBackend.get(`/medical-exam-order/${id}/pdf`, {
    ...(await getHeaders()),
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Obtener URL del PDF de orden de examen
 */
export const getExamOrderPdfUrl = async (id, expiresIn = 3600) => {
  const params = expiresIn ? `?expiresIn=${expiresIn}` : '';
  return (
    await requestBackend.get(`/medical-exam-order/${id}/pdf-url${params}`, await getHeaders())
  ).data;
};
