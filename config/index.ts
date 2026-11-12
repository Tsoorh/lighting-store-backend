import dotenv from 'dotenv';
dotenv.config();

export type Config = {
    postgresURL: string;
};

export const config: Config = {
    postgresURL: process.env.POSTGRES_URL || ''
};
