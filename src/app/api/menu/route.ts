import { db } from "@/lib/db";
import { NextResponse } from "next/server";

//JS-reducer method
export async function GET(req: Request){
    try {
        const {searchParams} = new URL(req.url);
        const locale = searchParams.get("locale") || "sv";

        const query = `
          SELECT 
            c.id AS category_id,
            COALESCE(ct.name, 'Unnamed') AS category_name,
            COALESCE(ct.description, '') AS category_description,

            i.id AS item_id,
            i.price,
            i.available,

            COALESCE(it.name, 'Unnamed') AS item_name,
            COALESCE(it.description, '') AS item_description
          FROM menu_categories AS c
          LEFT JOIN menu_categories_translations AS ct ON c.id = ct.category_id AND ct.locale = $1
          LEFT JOIN menu_items AS i ON c.id = i.category_id
          LEFT JOIN menu_item_translations AS it ON i.id = it.item_id AND it.locale = $1
          ORDER BY c.id, i.id;
        `;

        const result = await db.query(query, [locale]);
        const categoriesMap: Record<number, any> = {};

        for (const row of result.rows) {
            if (!categoriesMap[row.category_id]) {
                categoriesMap[row.category_id] = {
                    id: row.category_id,
                    name: row.category_name,
                    description: row.category_description,
                    items: [],
                };
            }
            if(row.item_id) {
                categoriesMap[row.category_id].items.push({
                    id: row.item_id,
                    name: row.item_name,
                    description: row.item_description,
                    price: row.price,
                    available: row.available,
                });
            }
        }
        const categories = Object.values(categoriesMap);
        return NextResponse.json({categories}, {status: 200});

    } catch (error){
        console.error("Error fetching menu: ", error);
        return NextResponse.json({error: "Server error"}, {status: 500});
    }
}


/* json_agg method
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "sv";

    const query = `
      SELECT 
        c.id AS category_id,
        COALESCE(ct.name, 'Unnamed') AS category_name,
        COALESCE(ct.description, '') AS category_description,
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'name', COALESCE(it.name, 'Unnamed'),
              'description', COALESCE(it.description, ''),
              'price', i.price,
              'available', i.available
            )
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) AS items
      FROM menu_categories AS c
      LEFT JOIN menu_categories_translations AS ct 
        ON c.id = ct.category_id AND ct.locale = $1
      LEFT JOIN menu_items AS i 
        ON c.id = i.category_id
      LEFT JOIN menu_item_translations AS it 
        ON i.id = it.item_id AND it.locale = $1
      GROUP BY c.id, ct.name, ct.description
      ORDER BY c.id;
    `;

    const result = await db.query(query, [locale]);
    return NextResponse.json({ categories: result.rows }, { status: 200 });

  } catch (error) {
    console.error("Error fetching menu: ", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
} */