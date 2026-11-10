import dotenv from 'dotenv';
dotenv.config();

import configProd from "./prod";
import configDev from "./dev";

export type Config = {
    postgresURL: string;
};

export let config: Config;

if (process.env.NODE_ENV === "production") {
    config = configProd;
} else {
    config = configDev;
}
