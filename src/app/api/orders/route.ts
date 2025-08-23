import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import z from "zod";

const createOrderSchema = z.object({
    firstName: z.string().trim().min(1, "First name required").optional(),
    lastName: z.string().trim().min(1, "Last name required").optional(),
    email: z.string().email("Email not valid").optional(),
    phone: z.string().trim().min(5, "Phone number not valid").optional(),
    bookingId: z.number().int().positive().optional(),
    items: z.array(
        z.object({
            menuItemId: z.number().int().positive(),
            quantity: z.number().int().positive(),
        })
    ).min(1, "At least one item is required!"),
});

export async function POST(req: Request){
    const session = await getServerSession(authOptions);

    try {
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({error: "Json data in request body is not valid"}, {status: 400});
        }
        const validation = createOrderSchema.safeParse(body);

        if(!validation.success){
            return NextResponse.json({error: "Validation error", details: validation.error.flatten()}, {status: 400});
        }
        const {firstName, lastName, email, phone, bookingId, items} = validation.data;

        if(!session?.user?.id) {
            if(!firstName || !lastName || !email || !phone){
                return NextResponse.json({error: "First name, last name, emial and phone are required for guests"}, {status: 400});
            }
        }

        const client = await db.connect();
        try {
            await client.query('BEGIN');
            let finalCustomerId: number
            if (session?.user?.id) {
                const customerRes = await client.query(
                    `SELECT id FROM customers WHERE user_id = $1`,
                    [session.user.id]
                );
                if(customerRes.rowCount === 0){
                    throw new Error("Authenticated user missing an associated customer profile");
                }
                finalCustomerId = customerRes.rows[0].id;
            } else {
                const upsertRes = await client.query(
                    `INSERT INTO customers (first_name, last_name, email, phone)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (email) DO UPDATE
                        SET first_name = EXCLUDED.first_name,
                            last_name = EXCLUDED.last_name,
                            phone = EXCLUDED.phone
                    RETURNING id`,
                    [firstName!, lastName!, email!, phone!]
                );
                finalCustomerId = upsertRes.rows[0].id
            }

            const orderRes = await client.query(
                `INSERT INTO orders (customer_id, booking_id)
                VALUES ($1, $2)
                RETURNING *`,
                [finalCustomerId, bookingId ?? null]
            );
            const order = orderRes.rows[0];

            const menuItemIds = items.map(item => item.menuItemId);
            const pricesRes = await client.query(
                `SELECT id, price FROM menu_items WHERE id = ANY($1::int[])`,
                [menuItemIds]
            );
            if(pricesRes.rowCount !== menuItemIds.length){
                const foundIds = new Set(pricesRes.rows.map(r => r.id));
                const missingIds = menuItemIds.filter(id => !foundIds.has(id));
                throw new Error(`Menu items not found: ${missingIds.join(", ")}`);
            }
            const priceMap = new Map<number, number>(pricesRes.rows.map(row => [row.id, Number(row.price)]));

            const quantities = items.map(item => item.quantity);
            const pricesAtOrder = items.map(item => priceMap.get(item.menuItemId)!);
                
            await client.query(
                `INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order)
                SELECT $1, UNNEST($2::int[]), UNNEST($3::int[]), UNNEST($4::numeric[])`,
                [order.id, menuItemIds, quantities, pricesAtOrder]
            );

            await client.query('COMMIT');

            const totalPrice = pricesAtOrder.reduce((sum, price, index) => sum + (price * quantities[index]), 0);

            return NextResponse.json({
                order: {
                    ...order,
                    items,
                    totalPrice
                }
            }, {status: 201});
        } catch (error){
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error){
        console.error("Error creating order: ", error);
        const errorMessage = error instanceof Error ? error.message : "Internal server error"
        return NextResponse.json({error: errorMessage}, {status: 500});
    }
}

export async function GET(req: Request){
    try {
        const {searchParams} = new URL(req.url);
        const customerId = searchParams.get("customerId");
        const status = searchParams.get("status");

        let query = `
        SELECT
            o.id AS order_id,
            o.status,
            o.created_at,
            o.updated_at,
            c.id AS customer_id,
            c.first_name,
            c.last_name,
            c.email,
            c.phone,
            json_agg(
                json_build_object(
                    'id', oi.id,
                    'menu_item_id', oi.menu_item_id,
                    'quantity', oi.quantity,
                    'price_at_order', oi.price_at_order
                )
            ) AS items
        FROM orders AS o
        JOIN customers AS c ON o.customer_id = c.id
        LEFT JOIN order_items AS oi ON o.id = oi.order_id`;

        const params: any[] = [];
        const conditions: string[] = [];
        
        if(customerId){
            conditions.push(`o.customer_id = $${params.length + 1}`);
            params.push(customerId);
        }
        if(status){
            conditions.push(`o.status = $${params.length + 1}`);
            params.push(status);
        }
        if(conditions.length > 0){
            query += ` WHERE ` + conditions.join(" AND ");
        }
        query += ` GROUP BY o.id, c.id ORDER BY o.created_at DESC`;
        const result = await db.query(query, params);
        return NextResponse.json(result.rows, {status: 200});
    } catch (error) {
        console.error("Error fetching orders: ", error);
        return NextResponse.json({error: "Server error"}, {status: 500});
    }
}

export async function PUT(req: Request){
    try {
        const {orderId, status} = await req.json();
        if(!orderId || !status) {
            return NextResponse.json({error: "orderId and status are required!"}, {status: 400});
        }
        const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
        if(!validStatuses.includes(status)){
            return NextResponse.json({error: `Invalid status. Must. be one of ${validStatuses.join(", ")}`}, {status: 400});
        }
        const updated = await db.query(
            `UPDATE orders
             SET status = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
             [status, orderId]
        );
        if(updated.rows.length === 0){
            return NextResponse.json({error: "Order not found"}, {status: 404});
        }
        return NextResponse.json(updated.rows[0], {status: 200});
    } catch (error){
        console.error("Error updating order", error);
        return NextResponse.json({error: "Server error"}, {status: 500});
    }
}

export async function DELETE(req: Request){
    try {
        const {orderId} = await req.json();
        if(!orderId){
            return NextResponse.json({error: "orderId is required!"}, {status: 400});
        }
        const existing = await db.query(
            `SELECT id FROM orders WHERE id = $1`,
            [orderId]
        );
        if(existing.rows.length === 0){
            return NextResponse.json({error: "Order not found"}, {status: 404});
        }
        await db.query(
            `DELETE FROM orders
             WHERE id = $1`,
            [orderId]
        );
        return NextResponse.json({success: true, orderId}, {status: 200});
    } catch (error){
        console.error("Error deleting order", error);
        return NextResponse.json({error: "Server error"}, {status: 500});
    }
}