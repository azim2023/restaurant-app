import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const {table_id, fName, lName, email, phone, booking_time, guests} = await req.json();
        if (!table_id || !fName || !lName || !phone || !booking_time || !guests) {
            return NextResponse.json({error: "Missing required fields"}, {status: 400});
        }
        const conflictCheck = await db.query (
            `SELECT * FROM bookings
             WHERE table_id = $1
             AND booking_time = $2
             AND status != 'cancelled'`,
             [table_id, booking_time]
        );
        if (conflictCheck.rows.length > 0) {
            return NextResponse.json({error: "Bordet är redan bokat vid den tiden"}, {status: 409});
        }
        const result = await db.query (
            `NSERT INTO booking (table_id, fName, lName, email, phone, booking_time, guests, status)
             VALUES ($1,$2,$3,$4,$5,$6, 'pending')
             RETURNING *`,
             [table_id, fName, lName, email, phone, booking_time, guests]
        );
        return NextResponse.json(result.rows[0], {status: 201});
    } catch (error) {
        console.error("Error creating booking:", error);
        return NextResponse.json({error: "Server error"}, {status: 500});
    }
}