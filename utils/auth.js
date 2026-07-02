export const getToken = () => {
  if (typeof window === "undefined") return null;
  const isAdminRoute = window.location.pathname.startsWith("/admin");
  return isAdminRoute 
    ? (localStorage.getItem("adminToken") || localStorage.getItem("token"))
    : (localStorage.getItem("token") || localStorage.getItem("adminToken"));
};

export const getUser = () => {
  if (typeof window === "undefined") return null;
  const isAdminRoute = window.location.pathname.startsWith("/admin");
  const user = isAdminRoute 
    ? (localStorage.getItem("adminUser") || localStorage.getItem("user"))
    : (localStorage.getItem("user") || localStorage.getItem("adminUser"));
  return user ? JSON.parse(user) : null;
};
