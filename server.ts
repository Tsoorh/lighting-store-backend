import dotenv from 'dotenv';
dotenv.config();


import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { loggerService } from "./services/logger.service";
import { setupAsyncLocalStorage } from "./middlewares/setupAls.middleware";
import path from 'path';


const app = express();

// **************config****************
const corsOptions = {
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true,
};

// middlewares
app.use(express.static('public'));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.set('query parser', 'extended');
// app.use(setupAsyncLocalStorage)

//api routing
import { authRoutes } from "./api/auth/auth.route";
import { productRoutes } from "./api/product/products.route";

app.use('/api/auth',authRoutes)
app.use('/api/product',productRoutes)




// * For SPA (Single Page Application) - catch all routes and send to the index.html
// app.get('/*all', (req, res) => {
//     res.sendFile(path.resolve('public/index.html'))
// })

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Server ready at port ${port}` ));


// for package.json -> script:  // "start": "set PORT=3030 & nodemon --ignore \"./data\" server.js"