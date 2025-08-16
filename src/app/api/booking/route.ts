import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const {table_id, firstName, lastName, email, phone, booking_time, guests} = await req.json();
        if (!table_id || !firstName || !lastName || !phone || !booking_time || !guests) {
            return NextResponse.json({error: "Missing required fields"}, {status: 400});
        }
        const first_name = firstName;
        const last_name = lastName;

        const {rows} = await db.query (
            `SELECT EXISTS (
             SELECT 1 
             FROM bookings
             WHERE table_id = $1
                AND booking_time = $2
                AND status != 'cancelled'
            ) AS conflict`,
            [table_id, booking_time]
        );
        if (rows[0].conflict) {
            return NextResponse.json({error: "The table is already booked"}, {status: 409});
        }

        let customer = (await db.query (
            `SELECT * FROM customers WHERE email = $1`,
            [email]
        )).rows[0];

        if (!customer) {
            customer = (await db.query(
                `INSERT INTO customers (first_name, last_name, email, phone)
                 VALUES ($1,$2,$3,$4)
                 RETURNING *`,
                [first_name, last_name, email, phone]
            )).rows[0];
        }

        const newBooking = await db.query(
            `INSERT INTO bookings (customer_id, table_id, booking_time, guests, status)
             VALUES ($1,$2,$3,$4, 'pending')
             RETURNING *`,
             [customer.id, table_id, booking_time, guests]
        );
        return NextResponse.json(newBooking.rows[0], {status: 201});
    } catch (error: any) {
        if (error.code === "23505"){
            return NextResponse.json({error: "The table is already booked"}, {status: 409});
        }
        console.error("Error creating booking:", error);
        return NextResponse.json({error: "Server error"}, {status: 500});
    }
}


export async function GET(req: Request) {
    try {
        const {searchParams} = new URL(req.url);
        const date = searchParams.get("date");
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const locale = searchParams.get("locale") || "sv";

        let query =
            `SELECT 
                b.id AS booking_id,
                b.booking_time,
                b.guests,
                b.status,
                b.created_at,

                t.id AS table_id,
                t.table_number,
                t.seats,

                tt.location,

                c.id AS customer_id,
                c.first_name,
                c.last_name,
                c.email,
                c.phone
            FROM bookings AS b
            LEFT JOIN tables AS t ON b.table_id = t.id
            LEFT JOIN table_translations AS tt ON t.id = tt.table_id AND tt.locale = $1
            LEFT JOIN customers AS c ON b.customer_id = c.id`
        ;
        const params: any[] = [locale];
        let condition: string[] = [];
        if(date) {
            if (isNaN(Date.parse(date))){
            return NextResponse.json({error: "Invalid date format"}, {status: 400});
            }
            condition.push(`DATE(b.booking_time) = $${params.length + 1}`);
            params.push(date);
        }
        if(from && to) {
            if (isNaN(Date.parse(from)) || isNaN(Date.parse(to))){
            return NextResponse.json({error: "Invalid selected date format"}, {status: 400});
            }
            condition.push(`DATE(b.booking_time) BETWEEN $${params.length + 1} AND $${params.length + 2}`);
            params.push(from, to);
        }
        if(condition.length > 0) {
            query += ` WHERE ` + condition.join(" AND ");
        }
        query += ` ORDER BY b.booking_time ASC`;
        const result = await db.query(query, params);

        const bookings = result.rows.map(row =>({
            id: row.booking_id,
            booking_time: row.booking_time,
            guests: row.guests,
            status: row.status,
            created_at: row.created_at,
            table: {
                id: row.table_id,
                number: row.table_number,
                seats: row.seats,
                location: row.location
            },
            customer: {
                id: row.customer_id,
                first_name: row.first_name,
                last_name: row.last_name,
                email: row.email,
                phone: row.phone
            }
        }));

        return NextResponse.json(bookings);
    } catch (error) {
        console.error("Error fetching booking: ", error);
        return NextResponse.json({error: "Server error"}, {status: 500});
    }
}