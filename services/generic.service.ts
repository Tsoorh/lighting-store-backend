import { ObjectId, WithId } from "mongodb"
import { dbService } from "./db.service"
import { loggerService } from "./logger.service"
import type { Document, Filter, FindOptions } from "mongodb"

export function genericService<T extends Document>(collectionName: string) {

    async function _getCollection() {
        return dbService.getCollection<T>(collectionName)
    }

    async function query(criteria: Filter<T> = {}): Promise<WithId<T>[]> {
        try {
            const collection = await _getCollection()
            return await collection.find<WithId<T>>(criteria).toArray()
        } catch (err) {
            loggerService.error(`Couldn't query items from ${collectionName}`, err)
            throw err
        }
    }

    async function getById(id: string | ObjectId, options: FindOptions = {}): Promise<WithId<T> | null> {
        try {
            const collection = await _getCollection()
            const criteria = { _id: new ObjectId(id) } as Filter<T>
            return await collection.findOne<WithId<T>>(criteria, options)
        } catch (err) {
            loggerService.error(`Couldn't get item from ${collectionName} by id: ${id}`, err)
            throw err
        }
    }

    async function add(item: T): Promise<WithId<T>> {
        try {
            const collection = await _getCollection();
            
            const res = await collection.insertOne(item as any); 
            if (!res.acknowledged || !res.insertedId) {
                throw new Error(`Failed to insert into ${collectionName}`);
            }
            
            return { ...item, _id: res.insertedId } as WithId<T>;
        } catch (err) {
            loggerService.error(`Couldn't add to ${collectionName}`, err);
            throw err;
        }
    }

    async function update(item: T & { _id?: string | ObjectId }): Promise<T> {
        try {
            if (!item._id) throw new Error('Update requires an _id');
            const collection = await _getCollection()
            const criteria = { _id: new ObjectId(item._id) } as Filter<T>
            const itemToUpdate = { ...item } as any
            delete itemToUpdate._id

            const res = await collection.updateOne(criteria, { $set: itemToUpdate })

            if (res.matchedCount === 0) throw new Error(`Couldn't find item to update in ${collectionName}`)
            return item
        } catch (err) {
            loggerService.error(`Couldn't update item in ${collectionName}`, err)
            throw err
        }
    }

    async function remove(id: string | ObjectId) {
        try {
            const collection = await _getCollection()
            const criteria = { _id: new ObjectId(id) } as Filter<T>
            const res = await collection.deleteOne(criteria)

            if (res.deletedCount === 0) throw new Error(`Couldn't remove item from ${collectionName}. ID not found.`);

            return id
        } catch (err) {
            loggerService.error(`Couldn't remove item from ${collectionName}`, err)
            throw err
        }
    }

    return {
        query,
        getById,
        add,
        update,
        remove
    }
}


