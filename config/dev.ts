import { Config } from '.';
import dotenv from 'dotenv';
dotenv.config();

export default {
    postgresURL: process.env.POSTGRES_URL || ''
} as Config;
