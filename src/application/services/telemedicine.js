import { requestQuery, requestBackend, getHeaders } from '../api';

/**
 * Get all telemedicine sessions (from query stack)
 * @param {Object} filters - Optional filters (commerceId, status)
 * @returns {Promise<Array>} List of telemedicine sessions
 */
export const getTelemedicineSessions = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.commerceId) params.append('commerceId', filters.commerceId);
  if (filters.status) params.append('status', filters.status);

  const queryString = params.toString();
  const url = `/telemedicine-sessions${queryString ? `?${queryString}` : ''}`;
  const response = await requestQuery.get(url);
  return response.data;
};

/**
 * Get telemedicine session by ID (from backend)
 * @param {string} id - Session ID
 * @returns {Promise<Object>} Telemedicine session
 */
export const getTelemedicineSession = async id => {
  const response = await requestBackend.get(`/telemedicine/sessions/${id}`, await getHeaders());
  return response.data;
};

/**
 * Get telemedicine session by ID (from query stack)
 * @param {string} id - Session ID
 * @returns {Promise<Object>} Telemedicine session
 */
export const getTelemedicineSessionById = async id => {
  const response = await requestQuery.get(`/telemedicine-sessions/${id}`);
  return response.data;
};

/**
 * Get telemedicine sessions by attention ID
 * @param {string} attentionId - Attention ID
 * @returns {Promise<Array>} List of telemedicine sessions
 */
export const getTelemedicineSessionsByAttentionId = async attentionId => {
  const response = await requestQuery.get(`/telemedicine-sessions/attention/${attentionId}`);
  return response.data;
};

/**
 * Get telemedicine dashboard statistics
 * @param {string} commerceId - Optional commerce ID to filter
 * @param {string} startDate - Optional start date (YYYY-MM-DD)
 * @param {string} endDate - Optional end date (YYYY-MM-DD)
 * @returns {Promise<Object>} Dashboard statistics
 */
export const getTelemedicineDashboardStats = async (
  commerceId = null,
  startDate = null,
  endDate = null
) => {
  const params = new URLSearchParams();
  if (commerceId) params.append('commerceId', commerceId);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const queryString = params.toString();
  const url = `/telemedicine-sessions/dashboard/stats${queryString ? `?${queryString}` : ''}`;
  const response = await requestQuery.get(url);
  return response.data;
};

/**
 * Get telemedicine sessions by date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string} commerceId - Optional commerce ID
 * @returns {Promise<Array>} List of telemedicine sessions
 */
export const getTelemedicineSessionsByDateRange = async (startDate, endDate, commerceId = null) => {
  const params = new URLSearchParams();
  params.append('startDate', startDate);
  params.append('endDate', endDate);
  if (commerceId) params.append('commerceId', commerceId);

  const response = await requestQuery.get(`/telemedicine-sessions?${params.toString()}`);
  return response.data;
};

/**
 * Start a telemedicine session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Updated session
 */
export const startTelemedicineSession = async sessionId => {
  const response = await requestBackend.post(
    `/telemedicine/sessions/${sessionId}/start`,
    {},
    await getHeaders()
  );
  return response.data;
};

/**
 * End a telemedicine session
 * @param {string} sessionId - Session ID
 * @param {Object} data - Optional notes and diagnosis
 * @returns {Promise<Object>} Updated session
 */
export const endTelemedicineSession = async (sessionId, data = {}) => {
  const response = await requestBackend.post(
    `/telemedicine/sessions/${sessionId}/end`,
    data,
    await getHeaders()
  );
  return response.data;
};

/**
 * Cancel a telemedicine session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Updated session
 */
export const cancelTelemedicineSession = async sessionId => {
  const response = await requestBackend.post(
    `/telemedicine/sessions/${sessionId}/cancel`,
    {},
    await getHeaders()
  );
  return response.data;
};

/**
 * Get messages from a telemedicine session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array>} List of messages
 */
export const getTelemedicineMessages = async sessionId => {
  const response = await requestBackend.get(
    `/telemedicine/sessions/${sessionId}/messages`,
    await getHeaders()
  );
  return response.data;
};

/**
 * Send a message in a telemedicine session
 * @param {Object} data - Message data (sessionId, message, senderType)
 * @returns {Promise<Object>} Created message
 */
export const sendTelemedicineMessage = async data => {
  const response = await requestBackend.post(
    '/telemedicine/messages',
    {
      sessionId: data.sessionId,
      message: data.message,
      senderType: data.senderType, // 'doctor' | 'patient'
    },
    await getHeaders()
  );
  return response.data;
};

/**
 * Give consent for recording
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Updated session
 */
export const giveTelemedicineConsent = async sessionId => {
  const response = await requestBackend.post(
    `/telemedicine/sessions/${sessionId}/consent`,
    {},
    await getHeaders()
  );
  return response.data;
};

/**
 * Save recording URL
 * @param {string} sessionId - Session ID
 * @param {string} recordingUrl - Recording URL
 * @returns {Promise<Object>} Updated session
 */
export const saveTelemedicineRecording = async (sessionId, recordingUrl) => {
  const response = await requestBackend.post(
    `/telemedicine/sessions/${sessionId}/recording`,
    { recordingUrl },
    await getHeaders()
  );
  return response.data;
};

/**
 * Send access key on demand (when user clicks join session)
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Updated session
 */
export const sendTelemedicineAccessKey = async sessionId => {
  const response = await requestBackend.post(
    `/telemedicine/sessions/${sessionId}/send-access-key`,
    {},
    await getHeaders()
  );
  return response.data;
};

/**
 * Mark patient as connected (public endpoint)
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Updated session
 */
export const markPatientConnected = async sessionId => {
  const response = await requestBackend.post(
    `/telemedicine/sessions/${sessionId}/patient-connected`,
    {}
  );
  return response.data;
};

/**
 * Mark doctor as connected
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Updated session
 */
export const markDoctorConnected = async sessionId => {
  const response = await requestBackend.post(
    `/telemedicine/sessions/${sessionId}/doctor-connected`,
    {},
    await getHeaders()
  );
  return response.data;
};

/**
 * Get telemedicine statistics (for monitoring)
 * @returns {Promise<Object>} Statistics with session counts by status
 */
export const getTelemedicineStatistics = async () => {
  const response = await requestBackend.get('/telemedicine/monitoring/stats', await getHeaders());
  return response.data;
};

/**
 * Get telemedicine health metrics (for monitoring)
 * @returns {Promise<Object>} Health metrics including active sessions and connections
 */
export const getTelemedicineHealthMetrics = async () => {
  const response = await requestBackend.get('/telemedicine/monitoring/health', await getHeaders());
  return response.data;
};
