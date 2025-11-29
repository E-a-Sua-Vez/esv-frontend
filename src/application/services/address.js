import { requestViaCep } from '../viacep';

export const getAddressBR = async cep => (await requestViaCep.get(`/${cep}/json`)).data;
