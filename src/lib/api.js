const BASE = "/api";

async function req(method, path, body, isForm = false) {
  const headers = {};
  if (!isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  auth: {
    register:       (body) => req("POST",   "/auth/register", body),
    login:          (body) => req("POST",   "/auth/login", body),
    me:             ()     => req("GET",    "/auth/me"),
    logout:         ()     => req("POST",   "/auth/logout"),
    changeEmail:    (body) => req("PUT",    "/auth/email", body),
    changePassword: (body) => req("PUT",    "/auth/password", body),
    deleteAccount:  (body) => req("DELETE", "/auth/account", body),
  },
  profile: {
    me:           ()       => req("GET",  "/profile/me"),
    insights:     ()       => req("GET",  "/profile/me/insights"),
    update:       (body)   => req("PUT",  "/profile/me", body),
    uploadAvatar: (file)   => {
      const fd = new FormData();
      fd.append("avatar", file);
      return req("POST", "/profile/me/avatar", fd, true);
    },
    deleteAvatar: () => req("DELETE", "/profile/me/avatar"),
    get: (username) => req("GET", `/profile/${username}`),
  },
};
