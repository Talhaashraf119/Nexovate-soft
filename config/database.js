import {Pool} from 'pg'
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
    console.log('PostgreSQL database connected successfully.');
});

pool.on('error', (error) => {
    console.error('Unexpected error ondatabase client:', error);
    process.exit(-1);
});

export default pool;