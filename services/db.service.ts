import { config } from "../config/index";
import { loggerService } from "./logger.service";
import { MongoClient, Db, Collection, Document } from "mongodb";


export const dbService = { getCollection, close };

let dbConn: Db | null = null
let client: MongoClient | null = null

async function getCollection<T extends Document>(collectionName: string): Promise<Collection<T>> {
    try {
        const db = await _connect()
        const collection = await db.collection<T>(collectionName)
        return collection
    } catch (err) {
        loggerService.error("Couldn't connect to Mongo collection")
        throw err
    }
}

async function _connect() :Promise<Db> {
    if (dbConn) return dbConn
    try {
        console.log("Attempting to connect to MongoDB URL:", config.dbURL);
        client = await MongoClient.connect(config.dbURL)
        return dbConn = client.db(config.dbName)
    } catch (err) {
        loggerService.error('Cannot connect to DB')
        throw err;
    }
}

async function close() {
    if (client) {
        await client.close()
        dbConn = null
        client = null
        console.log('MongoDB connection closed.')
    }
}