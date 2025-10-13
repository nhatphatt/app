export const getAuthToken = () => {
  return localStorage.getItem('minitake_token');
};

export const setAuthToken = (token) => {
  localStorage.setItem('minitake_token', token);
};

export const removeAuthToken = () => {
  localStorage.removeItem('minitake_token');
};

export const getAuthUser = () => {
  const userStr = localStorage.getItem('minitake_user');
  return userStr ? JSON.parse(userStr) : null;
};

export const setAuthUser = (user) => {
  localStorage.setItem('minitake_user', JSON.stringify(user));
};

export const removeAuthUser = () => {
  localStorage.removeItem('minitake_user');
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

export const logout = () => {
  removeAuthToken();
  removeAuthUser();
};