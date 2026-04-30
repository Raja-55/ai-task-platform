const TOKEN_KEY = "ai_task_token";
const AUTH_EVENT = "ai_task_auth_changed";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_EVENT));
};
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
};
export const authChangedEvent = AUTH_EVENT;
