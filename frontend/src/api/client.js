const BASE = import.meta.env.VITE_API_URL || '/api';

export const getToken = () => localStorage.getItem('mrplace_token');
export const setToken = (t) => localStorage.setItem('mrplace_token', t);
export const removeToken = () => localStorage.removeItem('mrplace_token');

const req = async (method, path, body, auth = true) => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
};

export const api = {
  get:    (path, auth)        => req('GET',    path, null, auth),
  post:   (path, body, auth)  => req('POST',   path, body, auth),
  put:    (path, body, auth)  => req('PUT',    path, body, auth),
  patch:  (path, body, auth)  => req('PATCH',  path, body, auth),
  delete: (path, auth)        => req('DELETE', path, null, auth),
};

// Auth
export const authApi = {
  login:    (data)   => api.post('/auth/login', data, false),
  register: (data)   => api.post('/auth/register', data, false),
  me:       ()       => api.get('/auth/me'),
  update:   (data)   => api.put('/auth/me', data),
};

// Products
export const productsApi = {
  list:        (params) => api.get('/products?' + new URLSearchParams(params).toString(), false),
  get:         (id)     => api.get(`/products/${id}`, false),
  suggestions: (q, cat) => api.get(`/products/search/suggestions?q=${q}&cat=${cat || ''}`, false),
  review:      (id, d)  => api.post(`/products/${id}/reviews`, d),
};

// Cart
export const cartApi = {
  list:   ()              => api.get('/cart'),
  add:    (productId, qty, variant) => api.post('/cart', { productId, qty, variant }),
  update: (productId, qty) => api.put(`/cart/${productId}`, { qty }),
  remove: (productId)      => api.delete(`/cart/${productId}`),
  clear:  ()              => api.delete('/cart'),
};

// Wishlist
export const wishlistApi = {
  list:   ()   => api.get('/wishlist'),
  ids:    ()   => api.get('/wishlist/ids'),
  toggle: (id) => api.post(`/wishlist/${id}`, {}),
};

// Orders
export const ordersApi = {
  create:  (data)  => api.post('/orders', data),
  list:    ()      => api.get('/orders'),
  get:     (id)    => api.get(`/orders/${id}`),
};

// Sellers
export const sellersApi = {
  list:     ()     => api.get('/sellers', false),
  get:      (slug) => api.get(`/sellers/${slug}`, false),
  products: (slug) => api.get(`/sellers/${slug}/products`, false),
};

// Categories
export const categoriesApi = {
  list:   ()     => api.get('/categories', false),
  brands: (slug) => api.get(`/categories/${slug}/brands`, false),
};

// Promo
export const promoApi = {
  validate: (code) => api.post('/promo/validate', { code }, false),
};

// Returns
export const returnsApi = {
  create:  (data) => api.post('/returns', data),
  list:    ()     => api.get('/returns'),
};

// Messages
export const messagesApi = {
  list:         ()              => api.get('/messages'),
  startConv:    (sellerId, body) => api.post(`/messages/seller/${sellerId}`, body),
  getConv:      (convId)        => api.get(`/messages/${convId}`),
  send:         (convId, content) => api.post(`/messages/${convId}/send`, { content }),
};

// Notifications
export const notificationsApi = {
  list:    ()   => api.get('/notifications'),
  readAll: ()   => api.patch('/notifications/read-all', {}),
};

// Loyalty
export const loyaltyApi = {
  get: () => api.get('/loyalty'),
};
