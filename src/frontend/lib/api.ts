
import axios from "axios";

// Base URL is root because we serve frontend from same express instance (or proxied in dev)
const api = axios.create({
  baseURL: "/",
});

export default api;
