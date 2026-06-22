import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'apty_user';
const dbPassword = process.env.DB_PASSWORD || 'apty_password';
const dbName = process.env.DB_NAME || 'mini_apty';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);

console.log(`Connecting to database at ${dbHost}:${dbPort}/${dbName} as ${dbUser}`);

export const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});
