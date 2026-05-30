import { dbService } from "./services/db.service";

async function testConnection() {
    try {
        console.log("Attempting to connect to database...");
        const collection = await dbService.getCollection("product");
        const count = await collection.countDocuments();
        console.log(`Successfully connected! Found ${count} products.`);
        
        const userCollection = await dbService.getCollection("user");
        const userCount = await userCollection.countDocuments();
        console.log(`Found ${userCount} users.`);

    } catch (err) {
        console.error("Failed to connect to database:", err);
        process.exit(1);
    }
}

testConnection();
