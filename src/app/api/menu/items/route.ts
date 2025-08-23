import { db } from "@/lib/db";
import { error } from "console";
import { NextResponse } from "next/server";

export async function POST(req: Request){
    try {
        const {categoryId, price, available, locale, name, description} = await req.json();

        if(!categoryId || !price || !locale || !name){
            return NextResponse.json({error: "price, locale and name are required!"}, {status: 400});
        }

        const category = await db.query(
            `INSERT INTO menu_items (category_id, price, available)
             VALUES ($1,$2,$3)
             RETURNING id`,
            [categoryId, price, available ?? true]
        );

        const itemId = category.rows[0].id;

        await db.query(
            `INSERT INTO menu_item_translations (item_id, locale, name, description)
             VALUES ($1,$2,$3,$4)`,
            [itemId, locale, name, description || ""]
        );

        return NextResponse.json({id: itemId, categoryId, price, available, locale, name, description}, {status: 201});
    } catch (error){
        console.error("Error creating menu item: ", error);
        return NextResponse.json({error: "Server error"}, {status: 500});
    }
}

export async function GET(req: Request) {
    try {
        const {searchParams} = new URL(req.url);
    const locale = searchParams.get("locale") || "sv";
    const itemId = searchParams.get("itemId");

    let query = `
        SELECT 
            i.id AS item_id,
            i.category_id,
            i.price,
            i.available,
            COALESCE(it.name, 'Unnamed') AS name,
            COALESCE(it.description, '') AS description
        FROM menu_items AS i
        LEFT JOIN menu_item_translations AS it ON i.id = it.item_id AND it.locale = $1`;

        const params: any[] = [locale];

        if (itemId) {
            query += ` WHERE i.id = $2`;
            params.push(itemId);
        }

        query += ` ORDER BY i.id`;
        const result = await db.query(query, params);
        
        if (itemId && result.rows.length === 0){
            return NextResponse.json({error: "Menu item not found"}, {status: 404});
        }

        const items = result.rows.map(row => ({
            id: row.item_id,
            categoryId: row.category_id,
            price: row.price,
            available: row.available,
            name: row.name,
            description: row.description || "",
        }));

        return NextResponse.json( {items}, {status: 200});
    } catch (error) {
        console.error("Error fetching menu items: ", error);
        return NextResponse.json({error: "Server error"}, {status: 500});
    }
}

export async function PUT(req: Request){
    try {
        const {itemId, categoryId, price, available, locale, name, description} = await req.json();
        
        if(!itemId || !locale || !name){
            return NextResponse.json({error: "itemId, locale and name are required!"}, {status: 400});
        }

        const existing = await db.query(
            `SELECT * FROM menu_items WHERE id = $1`,
            [itemId]
        );
        if(existing.rows.length === 0) {
            return NextResponse.json({error: "Menu item not found"}, {status: 404});
        }
        let menuItem;
        if(categoryId || price || available !== undefined) {
            menuItem = await db.query(
                `UPDATE menu_items
                 SET category_id = COALESCE($1, category_id),
                     price = COALESCE($2, price),
                     available = COALESCE($3, available),
                     updated_at = NOW()
                 WHERE id = $4
                 RETURNING *`,
                [categoryId, price, available, itemId]
            );
        }
        const base = menuItem?.rows[0] ?? existing.rows[0];

        const translation = await db.query(
            `INSERT INTO menu_item_translations (item_id, locale, name, description)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (item_id, locale) 
             DO UPDATE SET 
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                updated_at = NOW()
            RETURNING *`,
            [itemId, locale, name, description || ""]
        );
        const t = translation.rows[0];
        
        const responseData = {
            menuItem: {
                id: base.id,
                categoryId: base.category_id,
                price: base.price,
                available: base.available
            },
            translation: {
                itemId: t.item_id,
                locale: t.locale,
                name: t.name,
                description: t.description || ""
            }
        }

        return NextResponse.json(responseData, {status: 200});
    } catch (error){
        console.error("Error updating menu item: ", error);
        return NextResponse.json({error: "Server error"}, {status: 500});
    }
}


export async function DELETE(req: Request) {
    try{
        const {itemId} = await req.json();
        if (!itemId) {
            return NextResponse.json({error: "itemId is required!"}, {status: 400});
        }
        const existing = await db.query(
            `SELECT id from menu_items WHERE id = $1`,
            [itemId]
        );
        if (existing.rows.length === 0) {
            return NextResponse.json({error: "Menu item doesn't exist"}, {status: 404});
        }
        await db.query(`DELETE FROM menu_items WHERE id = $1`, [itemId]);
        return NextResponse.json({success: true, itemId}, {status: 200});
    } catch (error){
        console.error("Error deleting menu item: ", error);
        return NextResponse.json({error: "Server error"}, {status: 500});
    }
}