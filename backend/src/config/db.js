"use strict";

import ibmdb from "ibm_db"; // For Informix
import dotenv from "dotenv";
import { promises as fs } from "fs";
import path from "path";

dotenv.config();

// Database connection configuration
/**
 * INFORMIX CONNECTION LOGIC
 */

// Function to create a connection string for Informix
const createInformixConnectionString = (databaseConfig) => {
  const {
    server,
    database,
    host,
    port,
    protocol,
    user,
    password,
    authentication,
  } = databaseConfig;

  const connectionString = `SERVER=${server};DATABASE=${database};HOSTNAME=${host};AUTHENTICATION=${authentication};PORT=${port};PROTOCOL=${protocol};UID=${user};PWD=${password};`;
  console.log("Generated Informix Connection String:", connectionString);
  return connectionString;
};

// Function to get Informix database settings based on selection
const getInformixDatabaseConfig = (selectedDatabase) => {
  console.log("Getting Informix database configuration for:", selectedDatabase);
  switch (selectedDatabase) {
    case "Denver":
      return {
        server: process.env.INFORMIX_DNV_SERVER,
        database: process.env.INFORMIX_DNV_DATABASE,
        host: process.env.INFORMIX_DNV_HOST,
        port: process.env.INFORMIX_DNV_PORT,
        protocol: process.env.INFORMIX_DNV_PROTOCOL,
        user: process.env.INFORMIX_DNV_USER,
        password: process.env.INFORMIX_DNV_PASSWORD,
        authentication: process.env.INFORMIX_DNV_AUTHENTICATION,
      };
    case "MAC":
      return {
        server: process.env.INFORMIX_MAC_SERVER,
        database: process.env.INFORMIX_MAC_DATABASE,
        host: process.env.INFORMIX_MAC_HOST,
        port: process.env.INFORMIX_MAC_PORT,
        protocol: process.env.INFORMIX_MAC_PROTOCOL,
        user: process.env.INFORMIX_MAC_USER,
        password: process.env.INFORMIX_MAC_PASSWORD,
        authentication: process.env.INFORMIX_MAC_AUTHENTICATION,
      };
    case "NMSW":
      return {
        server: process.env.INFORMIX_NM_SERVER,
        database: process.env.INFORMIX_NM_DATABASE,
        host: process.env.INFORMIX_NM_HOST,
        port: process.env.INFORMIX_NM_PORT,
        protocol: process.env.INFORMIX_NM_PROTOCOL,
        user: process.env.INFORMIX_NM_USER,
        password: process.env.INFORMIX_NM_PASSWORD,
        authentication: process.env.INFORMIX_NM_AUTHENTICATION,
      };
    default:
      throw new Error("Invalid Informix database selected");
  }
};

// Function to connect to Informix database
export const getInformixConnection = async (selectedDatabase) => {
  console.log("Connecting to Informix database:", selectedDatabase);
  const databaseConfig = getInformixDatabaseConfig(selectedDatabase);

  try {
    const connStr = createInformixConnectionString(databaseConfig);
    console.log("Attempting to open Informix connection...");
    const connection = await ibmdb.open(connStr);
    console.log(
      "Connection successful to Informix database:",
      selectedDatabase
    );
    return connection;
  } catch (error) {
    console.error("Error connecting to Informix database:", error);
    throw error;
  }
};

// Mock functions for development without IBM_DB
// Create a connection pool
// const pool = ibmdb.Pool();
const pool = {
  open: (connStr, callback) => {
    console.log("Mock database connection created");
    console.log(`Connection string: ${connStr}`);

    // Mock connection object
    const conn = {
      query: (sql, params, callback) => {
        console.log(`Mock query executed: ${sql}`);
        console.log(`Parameters: ${JSON.stringify(params)}`);

        if (typeof callback === "function") {
          callback(null, []);
        } else {
          return Promise.resolve([]);
        }
      },
      querySync: (sql, params) => {
        console.log(`Mock querySync executed: ${sql}`);
        console.log(`Parameters: ${JSON.stringify(params)}`);
        return { fetchAllSync: () => [] };
      },
      prepare: (sql, callback) => {
        console.log(`Mock prepare executed: ${sql}`);

        const stmt = {
          execute: (params, callback) => {
            console.log(
              `Mock statement executed with params: ${JSON.stringify(params)}`
            );
            callback(null, []);
          },
          executeSync: (params) => {
            console.log(
              `Mock statement executeSync with params: ${JSON.stringify(
                params
              )}`
            );
            return { fetchAllSync: () => [] };
          },
        };

        if (typeof callback === "function") {
          callback(null, stmt);
        } else {
          return Promise.resolve(stmt);
        }
      },
      close: (callback) => {
        console.log("Mock connection closed");
        if (typeof callback === "function") {
          callback(null);
        } else {
          return Promise.resolve();
        }
      },
    };

    if (typeof callback === "function") {
      callback(null, conn);
    } else {
      return Promise.resolve(conn);
    }
  },
};

// Define a default connection string or remove it from exports if not needed
const connectionString = createInformixConnectionString(
  getInformixDatabaseConfig("Denver")
);

// Test the database connection
async function testConnection() {
  try {
    // For actual implementation:
    // const conn = await pool.open(connectionString);
    // conn.close();
    console.log("Database connection successful (mock)");
    return true;
  } catch (err) {
    console.error("Database connection failed:", err);
    return false;
  }
}

// Execute a query with parameters
async function query(sql, params = []) {
  try {
    // For actual implementation:
    // const conn = await pool.open(connectionString);
    // const result = await conn.query(sql, params);
    // conn.close();
    // return result;
    console.log(`Mock query executed: ${sql}`);
    console.log(`Parameters: ${JSON.stringify(params)}`);
    return [];
  } catch (err) {
    console.error("Query error:", err);
    throw err;
  }
}

// Execute a prepared statement
async function executeStatement(sql, params = []) {
  try {
    // For actual implementation:
    // const conn = await pool.open(connectionString);
    // const stmt = await conn.prepare(sql);
    // const result = await stmt.execute(params);
    // conn.close();
    // return result;
    console.log(`Mock prepared statement executed: ${sql}`);
    console.log(`Parameters: ${JSON.stringify(params)}`);
    return [];
  } catch (err) {
    console.error("Statement execution error:", err);
    throw err;
  }
}

// Replace the CommonJS exports with ES6 exports
export {
  connectionString,
  getInformixConnection,
  testConnection,
  query,
  executeStatement,
};
