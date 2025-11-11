"use strict";

import ibmdb from "ibm_db";
import dotenv from "dotenv";
import logger from "../utils/logger.js";
import path from "path";
import fs from "fs";

// Load .env – prefer local .env; if missing, fallback to Online_Enrollment backend .env
(() => {
  try {
    const localEnv = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(localEnv)) {
      dotenv.config({ path: localEnv });
      return;
    }
    // Fallback
    const fallbackEnv = path.resolve(
      process.cwd(),
      "..",
      "..",
      "backend",
      ".env"
    );
    if (fs.existsSync(fallbackEnv)) {
      dotenv.config({ path: fallbackEnv });
    } else {
      dotenv.config();
    }
  } catch {
    dotenv.config();
  }
})();

const validateEnvVariables = (prefix) => {
  const required = [
    `${prefix}_SERVER`,
    `${prefix}_DATABASE`,
    `${prefix}_HOST`,
    `${prefix}_PORT`,
    `${prefix}_USER`,
    `${prefix}_PASSWORD`,
    `${prefix}_PROTOCOL`,
    `${prefix}_AUTHENTICATION`,
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
};

const getDatabaseConfig = (clubId) => {
  const club = parseInt(clubId);
  if (club >= 201 && club <= 205) {
    validateEnvVariables("INFORMIX_NM");
    return {
      server: process.env.INFORMIX_NM_SERVER,
      database: process.env.INFORMIX_NM_DATABASE,
      host: process.env.INFORMIX_NM_HOST,
      port: process.env.INFORMIX_NM_PORT,
      user: process.env.INFORMIX_NM_USER,
      password: process.env.INFORMIX_NM_PASSWORD,
      protocol: process.env.INFORMIX_NM_PROTOCOL,
      authentication: process.env.INFORMIX_NM_AUTHENTICATION,
      state: "NM",
    };
  }
  if ((club >= 252 && club <= 257) || club === 292) {
    validateEnvVariables("INFORMIX_DNV");
    return {
      server: process.env.INFORMIX_DNV_SERVER,
      database: process.env.INFORMIX_DNV_DATABASE,
      host: process.env.INFORMIX_DNV_HOST,
      port: process.env.INFORMIX_DNV_PORT,
      user: process.env.INFORMIX_DNV_USER,
      password: process.env.INFORMIX_DNV_PASSWORD,
      protocol: process.env.INFORMIX_DNV_PROTOCOL,
      authentication: process.env.INFORMIX_DNV_AUTHENTICATION,
      state: "CO",
    };
  }
  if (club === 375) {
    validateEnvVariables("INFORMIX_MAC");
    return {
      server: process.env.INFORMIX_MAC_SERVER,
      database: process.env.INFORMIX_MAC_DATABASE,
      host: process.env.INFORMIX_MAC_HOST,
      port: process.env.INFORMIX_MAC_PORT,
      user: process.env.INFORMIX_MAC_USER,
      password: process.env.INFORMIX_MAC_PASSWORD,
      protocol: process.env.INFORMIX_MAC_PROTOCOL,
      authentication: process.env.INFORMIX_MAC_AUTHENTICATION,
      state: "CO",
    };
  }
  throw new Error(`Invalid club ID: ${clubId}`);
};

const getConnectionString = (clubId) => {
  const config = getDatabaseConfig(clubId);
  return (
    `DATABASE=${config.database};` +
    `HOSTNAME=${config.host};` +
    `SERVER=${config.server};` +
    `PROTOCOL=${config.protocol};` +
    `PORT=${config.port};` +
    `UID=${config.user};` +
    `PWD=${config.password};` +
    `AUTHENTICATION=${config.authentication};` +
    `CONNECTTYPE=1;` +
    `AUTHENTICATION=SERVER;` +
    `SECURITY=NONE;`
  );
};

const pool = {
  getConnection: (clubId) =>
    new Promise((resolve, reject) => {
      try {
        const connStr = getConnectionString(clubId);
        ibmdb.open(connStr, (err, conn) => {
          if (err) {
            logger.error("DB connect error", {
              error: err.message,
              clubId,
            });
            reject(err);
          } else {
            resolve(conn);
          }
        });
      } catch (e) {
        reject(e);
      }
    }),
  query: async (clubId, sql, params = []) => {
    let conn;
    try {
      conn = await pool.getConnection(clubId);
      return new Promise((resolve, reject) => {
        conn.query(sql, params, (err, data) => {
          if (err) {
            logger.error("DB query error", {
              error: err.message,
              clubId,
              sql,
            });
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    } finally {
      if (conn) {
        try {
          conn.close();
        } catch {}
      }
    }
  },
  getStateForClub: (clubId) => {
    try {
      return getDatabaseConfig(clubId).state;
    } catch {
      return null;
    }
  },
};

export { pool };
