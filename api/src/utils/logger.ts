import { createLogger, format, transports } from "winston";

export const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: "file-converter-api" },
  transports: [new transports.Console()]
});
