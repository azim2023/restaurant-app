import {db} from '@/lib/db'
 export async function GET() {
    try {
        const res = await db.query('SELECT NOW()');
        return new Response(JSON.stringify({ success: true, time: res.rows[0] }), {
            status: 200,
        });
    } catch (err) {
        return new Response(
            JSON.stringify({ success: false, error: (err as Error).message }),
            {status: 500}
        );
    }
 }