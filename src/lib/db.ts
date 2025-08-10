import { Pool } from 'pg';

declare global {
    var db: Pool | undefined;
}
export const db = 
    global.db ||
    new Pool({
        connectionString: process.env.DATABASE_URL
    });
if (process.env.NODE_ENV !== 'production') {
    global.db = db;
}