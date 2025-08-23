import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
    try {
        const {bookingId, status} = await req.json();
        if(!bookingId || !status) {
            return NextResponse.json({error: "bookingId and status are required!"}, {status: 400});
        }
        const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
        if(!validStatuses.includes(status)){
            return NextResponse.json({error: `Invalid status. Must be one of ${validStatuses.join(", ")}`}, {status: 400});
        }
        const updated = await db.query(
            `UPDATE bookings
             SET status = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [status, bookingId]
        );
        if(updated.rows.length === 0){
            return NextResponse.json({error: "Booking not found"}, {status: 404});
        }
        return NextResponse.json(updated.rows[0], {status: 200});
    } catch (error) {
        console.error("Error updating booking status: ", error);
        return NextResponse.json({error: "Server error"}, {status: 500});
    }
}