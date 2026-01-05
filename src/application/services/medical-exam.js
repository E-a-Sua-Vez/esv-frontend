import { requestBackend, getHeaders } from '../api';

const entity = 'medical-exam-order';

export const getAllMedicalExams = async () =>
  (await requestBackend.get(`/${entity}/exams`, await getHeaders())).data;

// ✅ Nuevo método
export const getMedicalExamByCommerce = async commerceId =>
  (await requestBackend.get(`/${entity}/exams/commerce/${commerceId}`, await getHeaders())).data;

export const getMedicalExamById = async id =>
  (await requestBackend.get(`/${entity}/exams/${id}`, await getHeaders())).data;

export const createMedicalExam = async exam =>
  (await requestBackend.post(`/${entity}/exams`, exam, await getHeaders())).data;

export const updateMedicalExam = async (id, exam) =>
  (await requestBackend.patch(`/${entity}/exams/${id}`, exam, await getHeaders())).data;

export const deleteMedicalExam = async id =>
  (await requestBackend.delete(`/${entity}/exams/${id}`, await getHeaders())).data;
