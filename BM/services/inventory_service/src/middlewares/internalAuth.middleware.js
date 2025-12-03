import { env } from "../configs/env.config.js";
import { INTERNAL_JOB_SECRET } from "../configs/env.config.js";
export default function internalAuth(req, res, next) {
  const token = req.headers["x-internal-secret"];

  if (token !== INTERNAL_JOB_SECRET)
    return res.status(403).json({ message: "Invalid internal secret" });

  next();
}
