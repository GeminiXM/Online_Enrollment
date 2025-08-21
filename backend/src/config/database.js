import ibmdb from "ibm_db";
import logger from "../utils/logger.js";

// Validate required environment variables
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

// Database mapping based on club ID
const getDatabaseConfig = (clubId) => {
  // Convert clubId to number if it's a string
  const club = parseInt(clubId);

  try {
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
      };
    } else if ((club >= 252 && club <= 257) || club === 292) {
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
      };
    } else if (club === 375) {
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
      };
    } else {
      throw new Error(`Invalid club ID: ${clubId}`);
    }
  } catch (error) {
    logger.error("Error getting database config:", {
      error: error.message,
      clubId,
      stack: error.stack,
    });
    throw error;
  }
};

// Get connection string for a specific club
const getConnectionString = (clubId) => {
  try {
    const config = getDatabaseConfig(clubId);
    // Format connection string for DRDA
    return (
      `DATABASE=${config.database};` +
      `HOSTNAME=${config.host};` +
      `SERVER=${config.server};` +
      `PROTOCOL=${config.protocol};` +
      `PORT=${config.port};` +
      `UID=${config.user};` +
      `PWD=${config.password};` +
      `AUTHENTICATION=${config.authentication};` +
      `CONNECTTYPE=1;` + // Use DRDA protocol
      `AUTHENTICATION=SERVER;` +
      `SECURITY=NONE;`
    );
  } catch (error) {
    logger.error("Error creating connection string:", {
      error: error.message,
      clubId,
      stack: error.stack,
    });
    throw error;
  }
};

// Create a connection pool
const pool = {
  // Get a connection from the pool for a specific club
  getConnection: (clubId) => {
    return new Promise((resolve, reject) => {
      try {
        const connStr = getConnectionString(clubId);
        logger.info("Attempting database connection:", {
          clubId,
          // Log connection string without sensitive info
          connectionString: connStr
            .replace(/PWD=[^;]+/, "PWD=*****")
            .replace(/UID=[^;]+/, "UID=*****"),
        });

        ibmdb.open(connStr, (err, conn) => {
          if (err) {
            logger.error("Error connecting to database:", {
              error: err.message,
              clubId,
              stack: err.stack,
              sqlState: err.state,
              sqlCode: err.code,
            });
            reject(err);
          } else {
            logger.info(`Connected to database for club ${clubId}`);
            resolve(conn);
          }
        });
      } catch (error) {
        logger.error("Error in getConnection:", {
          error: error.message,
          clubId,
          stack: error.stack,
        });
        reject(error);
      }
    });
  },

  // Execute a query for a specific club
  query: async (clubId, sql, params = []) => {
    let conn;
    try {
      conn = await pool.getConnection(clubId);
      return new Promise((resolve, reject) => {
        conn.query(sql, params, (err, data) => {
          if (err) {
            logger.error("Error executing query:", {
              error: err.message,
              clubId,
              sql,
              params,
              stack: err.stack,
              sqlState: err.state,
              sqlCode: err.code,
            });
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    } catch (error) {
      throw error;
    } finally {
      if (conn) {
        conn.close((err) => {
          if (err)
            logger.error("Error closing connection:", {
              error: err.message,
              clubId,
            });
        });
      }
    }
  },
};

export { pool };
