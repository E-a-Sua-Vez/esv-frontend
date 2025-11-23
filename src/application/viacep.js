import axios from 'axios';

const viaCepUrl = import.meta.env.VITE_VIACEP_URL;

const VIACEP_CONFIG = {
  timeout: 30000,
  baseURL: viaCepUrl,
  contentType: 'application/json',
};

const requestViaCep = axios.create(VIACEP_CONFIG);

export { requestViaCep };
