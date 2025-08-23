import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request){
    try {
        const {locale, name, description} = await req.json();

        if(!locale || !name) {
            return NextResponse.json({error: "Locale and name are required!"}, {status: 400});
        }
        const category = await db.query(
            `INSERT INTO menu_categories DEFAULT VALUES RETURNING id`
        );
        const categoryId = category.rows[0].id;
        await db.query(
            `INSERT INTO menu_categories_translations
              (category_id, locale, name, description)
             VALUES ($1,$2,$3,$4)`,
            [categoryId, locale, name, description || ""]
        );
        return NextResponse.json({id: categoryId, locale, name, description}, {status: 201});
    } catch (error) {
        console.error("Error creating category: ", error);
        return NextResponse.json({error: "Server error"}, {status: 500});
    }
}

export async function GET(req: Request){
    try {
        const {searchParams} = new URL(req.url);
        const categoryId = searchParams.get("categoryId");
        const locale = searchParams.get("locale") || "sv";

        let query = `
        SELECT 
            c.id AS category_id,
            c.created_at,
            c.updated_at,
            
            COALESCE(ct.name, 'Unnamed') AS name,
            COALESCE(ct.description, '') AS description,
        FROM menu_categories AS c
        LEFT JOIN menu_categories_translations AS ct ON c.id = ct.category_id AND ct.locale = $1
        ${categoryId ? 'WHERE c.id = $2' : ''}
        ORDER BY c.id`;

        const params: any[] = [locale];
        if(categoryId) {
            params.push(categoryId);
        }
        const result = await db.query(query, params);

        if(categoryId && result.rows.length === 0){
            return NextResponse.json({error: "Menu category not found"}, {status: 404});
        }
        const categories = result.rows.map(row => ({
            category: {
                id: row.category_id,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            },
            translation: {
                name: row.name,
                description: row.description,
                locale
            }
        }));
        const responseData = categoryId ? categories[0] : {categories};
        return NextResponse.json(responseData, {status: 200});
    } catch (error){
        console.error("Error fetching menu categories", error);
        return NextResponse.json({error: "Server error"}, {status: 500});
    }
}

export async function PUT(req: Request) {
    try {
        const {categoryId, locale, name, description} = await req.json();

        if(!categoryId || !locale || !name) {
            return NextResponse.json({error: "categoryId, locale and name are required!"}, {status: 400});
        }

        const categoryExists = await db.query(
            `SELECT * FROM menu_categories WHERE id = $1`,
            [categoryId]
        );
        if(categoryExists.rows.length === 0){
            return NextResponse.json({error: "Category not found"}, {status: 404});
        }

        const base = categoryExists.rows[0];

        const translation = await db.query(
            `INSERT INTO menu_categories_translations (category_id, locale, name, description)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (category_id, locale)
             DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                updated_at = NOW()
            RETURNING *`,
            [categoryId, locale, name, description || ""]
        );
        const t = translation.rows[0] ?? {};
        const responseData = {
            category: {
                id: base.id,
                createdAt: base.created_at,
                updatedAt: base.updated_at
            },
            translation: {
                categoryId: t.category_id,
                locale: t.locale,
                name: t.name,
                description: t.description || ""
            }
        };
        return NextResponse.json(responseData, {status: 200})
    } catch (error) {
        console.error("Error updating category: ", error);
        return NextResponse.json({error: "server error"}, {status: 500});
    }
}

export async function DELETE(req: Request){
    try {
        const {categoryId} = await req.json();
        if (!categoryId){
            return NextResponse.json({error: "categoryId is required!"}, {status: 400});
        }
        const existing = await db.query(
            `SELECT id FROM menu_categories WHERE id = $1`,
            [categoryId]
        );
        if(existing.rowCount === 0) {
            return NextResponse.json({error: "Menu category not found"}, {status: 404});
        }
        await db.query( `DELETE FROM menu_categories WHERE id = $1`, [categoryId]);
        return NextResponse.json({success: true, categoryId}, {status: 200});
    } catch (error) {
        console.error("Error deleting menu category: ", error);
        return NextResponse.json({error: "Server error"}, {status: 500});
    }
}