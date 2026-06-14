import dotenv from 'dotenv';
dotenv.config();


import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { loggerService } from "./services/logger.service";
import { setupAsyncLocalStorage } from "./middlewares/setupAls.middleware";
import path from 'path';


const app = express();
app.set('trust proxy', 1);

// **************config****************
const isProd = process.env.NODE_ENV === 'production';
const corsOptions = {
  origin: isProd 
          ? [
              "https://tiranlasry.com", 
              "https://www.tiranlasry.com",
              "https://tiran-lasry.pages.dev",
              "https://tiran-lasry-frontend.pages.dev",
              "http://localhost:5173",
              "http://127.0.0.1:5173"
            ]
          : ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true,
};

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per `window` (here, per 15 minutes)
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.cloudinary.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
    }
  }
}));
app.use(express.static('public'));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.set('query parser', 'extended');
app.use(setupAsyncLocalStorage)

// Apply rate limiting to API routes
app.use('/api/', limiter);

//api routing
import { authRoutes } from "./api/auth/auth.route";
import { productRoutes } from "./api/product/products.route";
import { userRoutes } from "./api/user/user.route";
import { dbService } from "./services/db.service";

app.use('/api/auth',authRoutes)
app.use('/api/product',productRoutes)
app.use('/api/user', userRoutes)

// Graceful shutdown
const shutdown = async (signal: string) => {
    loggerService.info(`Received ${signal}. Shutting down gracefully...`);
    await dbService.close();
    process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));




// * For SPA (Single Page Application) - catch all routes and send to the index.html
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.resolve('public/index.html'))
})

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    loggerService.error('Unhandled Error:', err);
    res.status(500).send('Internal Server Error');
});

const port = process.env.PORT || 3000
app.listen(port, () => loggerService.info(`Server ready at port ${port}` ));


// for package.json -> script:  // "start": "set PORT=3030 & nodemon --ignore \"./data\" server.js"