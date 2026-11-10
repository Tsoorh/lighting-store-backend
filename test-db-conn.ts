import { dbService } from "./services/db.service";
import { productService } from "./api/product/products.service";
import { userService } from "./api/user/user.service";

async function testConnection() {
    try {
        console.log("Attempting to connect to PostgreSQL database...");
        const products = await productService.query();
        console.log(`Successfully connected! Found ${products.length} products.`);
        
        const users = await userService.query();
        console.log(`Found ${users.length} users.`);

        await dbService.close();
    } catch (err) {
        console.error("Failed to connect to database:", err);
        await dbService.close().catch(() => {});
        process.exit(1);
    }
}

testConnection();
