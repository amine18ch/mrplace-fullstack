const BASE = '/api/seller';
const KEY  = 'seller_token';

export const getSellerToken  = ()  => sessionStorage.getItem(KEY);
export const setSellerToken  = (t) => sessionStorage.setItem(KEY, t);
export const removeSellerToken = () => sessionStorage.removeItem(KEY);

const req = async (method, path, body) => {
  const token = getSellerToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
};

export const sellerApi = {
  get:    (path)        => req('GET',    path),
  post:   (path, body)  => req('POST',   path, body),
  put:    (path, body)  => req('PUT',    path, body),
  patch:  (path, body)  => req('PATCH',  path, body),
  delete: (path)        => req('DELETE', path),
};

// Upload une image produit (multipart)
export const uploadProductImage = async (file) => {
  const token = getSellerToken();
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch('/api/upload/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur upload');
  return data; // { url, filename }
};
