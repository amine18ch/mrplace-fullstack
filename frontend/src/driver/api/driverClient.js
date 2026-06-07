const BASE = '/api/driver';

const getToken = () => sessionStorage.getItem('driver_token');
const setToken = (t) => sessionStorage.setItem('driver_token', t);
const removeToken = () => sessionStorage.removeItem('driver_token');

const req = async (method, path, body) => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur');
  return data;
};

export const driverApi = {
  get:   (path) => req('GET', path),
  post:  (path, body) => req('POST', path, body),
  patch: (path, body) => req('PATCH', path, body),
};

export { getToken as getDriverToken, setToken as setDriverToken, removeToken as removeDriverToken };
