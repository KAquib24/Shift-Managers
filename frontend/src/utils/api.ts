import axios from "axios";

/*
  Works for:
  ✅ local dev
  ✅ docker
  ✅ production
*/
const BASE_URL =
  import.meta.env.VITE_API_URL || "/api";

export const getAPI = () => {
  const token = localStorage.getItem("token");

  return axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  });
};