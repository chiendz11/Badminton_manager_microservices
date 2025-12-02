import { env } from "../configs/env.config.js";

export default function internalAuth(req, res, next) {
  const token = req.headers["x-internal-secret"];

  if (token !== env.internalSecret)
    return res.status(403).json({ message: "Invalid internal secret" });

  next();
}
