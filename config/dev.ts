import { Config } from ".";

export default {
    dbURL: process.env.MONGO_URL || "mongodb://172.30.80.1:27017",
    dbName: "tiran_lasry_db"
} as Config