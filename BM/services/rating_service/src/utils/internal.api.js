import axios from "axios";

export const internalAPI = axios.create({
  baseURL: "http://localhost:5005",
  headers: {
    "x-internal-secret": process.env.INTERNAL_AUTH_SECRET,
  },
});
