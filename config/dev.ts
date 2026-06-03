import { Config } from '.';
import dotenv from 'dotenv';
dotenv.config();

export default {
    // dbURL: process.env.MONGO_URL || "mongodb://172.30.80.1:27017",
    dbURL: process.env.MONGO_URL ,
    dbName: process.env.DB_NAME
} as Config