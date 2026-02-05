import { requestBackend, getHeaders } from '../api';

const entity = 'documents';

export const getDocumentByCommerceId = async commerceId =>
  (await requestBackend.get(`/${entity}/commerceId/${commerceId}`, await getHeaders())).data;

export const getDocumentByCommerceIdAndClient = async (commerceId, clientId) =>
  (
    await requestBackend.get(
      `/${entity}/commerceId/${commerceId}/client/${clientId}`,
      await getHeaders()
    )
  ).data;

export const getDocumentOptions = async () =>
  (await requestBackend.get(`/${entity}/options/all`, await getHeaders())).data;

export const addDocument = async (document, file) => {
  const options = { ...(await getHeaders()) };
  options.headers['Content-Type'] = 'multipart/form-data';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('commerceId', document.commerceId);
  formData.append('name', document.name);
  formData.append('format', document.format);
  formData.append('reportType', document.reportType);
  return (await requestBackend.post(`/${entity}`, formData, options)).data;
};

export const addClientDocument = async (document, file) => {
  const options = { ...(await getHeaders()) };
  options.headers['Content-Type'] = 'multipart/form-data';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('commerceId', document.commerceId);
  formData.append('clientId', document.clientId);
  formData.append('name', document.name);
  formData.append('format', document.format);
  formData.append('documentMetadata', document.documentMetadata);
  formData.append('reportType', document.reportType);
  formData.append('details', document.details);

  // Enhanced ecosystem integration fields
  if (document.attentionId) formData.append('attentionId', document.attentionId);
  if (document.patientHistoryId) formData.append('patientHistoryId', document.patientHistoryId);
  if (document.collaboratorId) formData.append('collaboratorId', document.collaboratorId);
  if (document.category) formData.append('category', document.category);
  if (document.urgency) formData.append('urgency', document.urgency);
  if (document.tags) formData.append('tags', document.tags.join(','));
  if (document.clinicalNotes) formData.append('clinicalNotes', document.clinicalNotes);
  if (document.studyDate) formData.append('studyDate', document.studyDate);
  if (document.expirationDate) formData.append('expirationDate', document.expirationDate);
  if (document.isConfidential !== undefined)
    formData.append('isConfidential', document.isConfidential);

  return (await requestBackend.post(`/${entity}/client`, formData, options)).data;
};

export const getDocumentByOption = async (commerceId, option) =>
  (
    await requestBackend.get(
      `/${entity}/commerceId/${commerceId}/option/${option}`,
      await getHeaders()
    )
  ).data;

export const getDocument = async (commerceId, reportType) => {
  const options = { responseType: 'blob', ...(await getHeaders()) };
  return (await requestBackend.get(`/${entity}/${commerceId}/${reportType}`, options)).data;
};

export const getClientDocument = async (commerceId, clientId, reportType, name) => {
  const options = { responseType: 'blob', ...(await getHeaders()) };
  // If clientId is not provided, use the old format for backward compatibility
  const documentKey = clientId ? `${commerceId}/${clientId}` : commerceId;
  return (
    await requestBackend.get(`/${entity}/client/${documentKey}/${reportType}/${name}`, options)
  ).data;
};

export const activeDocument = async (id, document) =>
  (await requestBackend.patch(`/${entity}/${id}/active`, document, await getHeaders())).data;

export const availableDocument = async (id, document) =>
  (await requestBackend.patch(`/${entity}/${id}/available`, document, await getHeaders())).data;

// Enhanced Document Services for Ecosystem Integration

export const getDocumentsByAttention = async attentionId => {
  try {
    // Try query stack first for better performance
    const queryUrl = `${
      process.env.VITE_QUERY_URL || 'http://localhost:3003'
    }/documents/attention/${attentionId}`;
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(await getHeaders()).headers,
      },
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error('Query stack unavailable');
  } catch (error) {
    console.warn('Query stack unavailable, falling back to backend:', error);
    // Fallback to backend
    return (await requestBackend.get(`/${entity}/attention/${attentionId}`, await getHeaders()))
      .data;
  }
};

export const getDocumentsByPatientHistory = async patientHistoryId => {
  const queryUrl = `${
    process.env.VITE_QUERY_URL || 'http://localhost:3003'
  }/documents/patient-history/${patientHistoryId}`;

  try {
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(await getHeaders()).headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Query stack error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching documents from query stack:', error);
    // Fallback to backend if query stack fails
    return (await requestBackend.get(`/${entity}/patient-history/${patientHistoryId}`, await getHeaders()))
      .data;
  }
};

export const searchDocuments = async searchCriteria => {
  // Use query stack for better performance
  const queryParams = new URLSearchParams();

  Object.keys(searchCriteria).forEach(key => {
    if (
      searchCriteria[key] !== undefined &&
      searchCriteria[key] !== null &&
      searchCriteria[key] !== ''
    ) {
      if (Array.isArray(searchCriteria[key])) {
        searchCriteria[key].forEach(value => queryParams.append(key, value));
      } else {
        queryParams.append(key, searchCriteria[key]);
      }
    }
  });

  const queryUrl = `${
    process.env.VITE_QUERY_URL || 'http://localhost:3003'
  }/documents?${queryParams.toString()}`;

  try {
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(await getHeaders()).headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Query stack error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Query stack unavailable, falling back to backend search:', error);
    // Fallback to backend search
    return (await requestBackend.post(`/${entity}/search`, searchCriteria, await getHeaders()))
      .data;
  }
};

export const linkDocumentToAttention = async (documentId, attentionId) =>
  (
    await requestBackend.patch(
      `/${entity}/${documentId}/link-attention`,
      { attentionId },
      await getHeaders(),
    )
  ).data;

export const updateDocumentTags = async (documentId, tags) =>
  (await requestBackend.patch(`/${entity}/${documentId}/tags`, { tags }, await getHeaders())).data;

export const updateDocumentCategory = async (documentId, category) =>
  (await requestBackend.patch(`/${entity}/${documentId}/category`, { category }, await getHeaders())).data;

export const updateDocumentUrgency = async (documentId, urgency) =>
  (await requestBackend.patch(`/${entity}/${documentId}/urgency`, { urgency }, await getHeaders())).data;

export const logDocumentAccess = async (documentId, accessType, userType, ipAddress, userAgent) =>
  (
    await requestBackend.post(
      `/${entity}/${documentId}/access-log`,
      {
        accessType,
        userType,
        ipAddress,
        userAgent,
      },
      await getHeaders(),
    )
  ).data;

// Document Categories and Utilities
export const getDocumentCategories = () => [
  { value: 'LABORATORY_RESULTS', label: 'Resultados de Laboratorio', icon: 'bi-clipboard-data' },
  { value: 'IMAGING_STUDIES', label: 'Estudios de Imagen', icon: 'bi-camera' },
  { value: 'PATHOLOGY_REPORTS', label: 'Informes de Patología', icon: 'bi-file-medical' },
  { value: 'CONSULTATION_NOTES', label: 'Notas de Consulta', icon: 'bi-journal-text' },
  { value: 'DISCHARGE_SUMMARIES', label: 'Resúmenes de Alta', icon: 'bi-file-earmark-text' },
  { value: 'REFERRAL_LETTERS', label: 'Cartas de Referencia', icon: 'bi-envelope-paper' },
  { value: 'PRESCRIPTION_RECORDS', label: 'Recetas Médicas', icon: 'bi-prescription2' },
  { value: 'CONSENT_FORMS', label: 'Formularios de Consentimiento', icon: 'bi-file-earmark-check' },
  { value: 'INSURANCE_CARDS', label: 'Tarjetas de Seguro', icon: 'bi-credit-card' },
  { value: 'IDENTIFICATION', label: 'Documentos de Identificación', icon: 'bi-person-badge' },
  { value: 'MEDICAL_HISTORY', label: 'Historial Médico', icon: 'bi-journal-medical' },
  { value: 'ALLERGIES_MEDICATIONS', label: 'Alergias y Medicamentos', icon: 'bi-capsule' },
  { value: 'BILLING_DOCUMENTS', label: 'Documentos de Facturación', icon: 'bi-receipt' },
  { value: 'APPOINTMENT_CONFIRMATIONS', label: 'Confirmaciones de Cita', icon: 'bi-calendar-check' },
  { value: 'EXTERNAL_REPORTS', label: 'Informes Externos', icon: 'bi-file-earmark-arrow-up' },
  { value: 'PREVIOUS_TREATMENTS', label: 'Tratamientos Previos', icon: 'bi-activity' },
  { value: 'SPECIALIST_REPORTS', label: 'Informes de Especialistas', icon: 'bi-person-hearts' },
  { value: 'OTHER', label: 'Otros', icon: 'bi-file-earmark' },
];

export const getDocumentUrgencyLevels = () => [
  { value: 'LOW', label: 'Baja', color: '#28a745', icon: 'bi-arrow-down-circle' },
  { value: 'NORMAL', label: 'Normal', color: '#007bff', icon: 'bi-dash-circle' },
  { value: 'HIGH', label: 'Alta', color: '#ffc107', icon: 'bi-arrow-up-circle' },
  { value: 'CRITICAL', label: 'Crítica', color: '#dc3545', icon: 'bi-exclamation-triangle-fill' },
];

export const getDocumentStatusOptions = () => [
  { value: 'PENDING_REVIEW', label: 'Pendiente de Revisión', color: '#ffc107' },
  { value: 'REVIEWED', label: 'Revisado', color: '#28a745' },
  { value: 'ACTIVE', label: 'Activo', color: '#007bff' },
  { value: 'ARCHIVED', label: 'Archivado', color: '#6c757d' },
  { value: 'EXPIRED', label: 'Expirado', color: '#dc3545' },
];

export const getFileTypeIcon = format => {
  if (!format) return 'bi-file-earmark';

  const formatLower = format.toLowerCase();

  if (formatLower.includes('pdf')) return 'bi-file-earmark-pdf';
  if (
    formatLower.includes('image') ||
    ['jpg', 'jpeg', 'png', 'gif', 'bmp'].some(ext => formatLower.includes(ext))
  ) {
    return 'bi-file-earmark-image';
  }
  if (formatLower.includes('word') || ['doc', 'docx'].some(ext => formatLower.includes(ext))) {
    return 'bi-file-earmark-word';
  }
  if (formatLower.includes('excel') || ['xls', 'xlsx'].some(ext => formatLower.includes(ext))) {
    return 'bi-file-earmark-excel';
  }
  if (
    formatLower.includes('video') ||
    ['mp4', 'avi', 'mov'].some(ext => formatLower.includes(ext))
  ) {
    return 'bi-file-earmark-play';
  }
  if (
    formatLower.includes('audio') ||
    ['mp3', 'wav', 'ogg'].some(ext => formatLower.includes(ext))
  ) {
    return 'bi-file-earmark-music';
  }

  return 'bi-file-earmark';
};

/**
 * Track document access (view/preview)
 * Automatically called when documents are viewed
 */
export const trackDocumentAccess = async (
  documentId,
  accessType = 'view',
  userType = 'collaborator',
) => {
  try {
    const options = await getHeaders();
    const ipAddress = await getClientIP();
    const userAgent = navigator.userAgent;

    await requestBackend.post(
      `/${entity}/${documentId}/access-log`,
      {
        accessType,
        userType,
        ipAddress,
        userAgent,
      },
      options
    );
  } catch (error) {
    console.warn('Failed to track document access:', error);
    // Don't throw - tracking failures shouldn't break the UI
  }
};

/**
 * Track document download
 * Automatically called when documents are downloaded
 */
export const trackDocumentDownload = async (documentId, userType = 'collaborator') => {
  try {
    const options = await getHeaders();
    const ipAddress = await getClientIP();
    const userAgent = navigator.userAgent;

    await requestBackend.post(
      `/${entity}/${documentId}/track-download`,
      {
        userType,
        ipAddress,
        userAgent,
      },
      options
    );
  } catch (error) {
    console.warn('Failed to track document download:', error);
    // Don't throw - tracking failures shouldn't break the UI
  }
};

/**
 * Get client IP address (helper function)
 */
const getClientIP = async () => {
  try {
    // Try to get IP from a service (if needed)
    // For now, return empty string as IP will be captured server-side
    return '';
  } catch {
    return '';
  }
};
