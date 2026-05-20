const BASE = '/api/admin';

const getAdminToken = () => sessionStorage.getItem('admin_token');
const setAdminToken = (t) => sessionStorage.setItem('admin_token', t);
const removeAdminToken = () => sessionStorage.removeItem('admin_token');

const adminReq = async (method, path, body) => {
  const token = getAdminToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur');
  return data;
};

export const adminApi = {
  get:    (path) => adminReq('GET', path),
  post:   (path, body) => adminReq('POST', path, body),
  put:    (path, body) => adminReq('PUT', path, body),
  patch:  (path, body) => adminReq('PATCH', path, body),
  delete: (path) => adminReq('DELETE', path),
};

export { getAdminToken, setAdminToken, removeAdminToken };
