import { db } from "@/lib/db";

const usersData = [
  { first_name: "Admin", last_name: "User", email: "admin@example.com", password_hash: "hashedpassword", role: "admin" },
  { first_name: "Staff", last_name: "Member", email: "staff@example.com", password_hash: "hashedpassword", role: "staff" },
];

const customersData = [
  { first_name: "Anders", last_name: "Svensson", email: "anders@example.com", phone: "0701234567" },
  { first_name: "Anna", last_name: "Svensson", email: "anna@example.com", phone: "0709876543" },
];

const tablesData = [
  { table_number: 1, seats: 4, translations: { sv: "Fönsterplats", en: "Window seat" } },
  { table_number: 2, seats: 4, translations: { sv: "Fönsterplats", en: "Window seat" } },
];

const categoriesData = [
  { translations: { sv: { name: "Förrätter", description: "Smårätter" }, en: { name: "Starters", description: "Small dishes" } } },
];

const menuItemsData = [
  { category_index: 0, price: 79.0, translations: { sv: { name: "Bruschetta", description: "Rostat bröd" }, en: { name: "Bruschetta", description: "Toasted bread" } } },
];

const bookingsData = [
  { customer_index: 0, table_index: 0, booking_time: "2025-08-20T18:00:00Z", guests: 2, status: "pending" },
  { customer_index: 1, table_index: 1, booking_time: "2025-08-20T18:00:00Z", guests: 2, status: "completed" },
];

const ordersData = [
  { customer_index: 0, booking_index: 0, status: "pending" },
];

const orderItemsData = [
  { order_index: 0, menu_item_index: 0, quantity: 1, price_at_order: 79.0 },
];

async function seed() {
  try {
    console.log("Börjar seeding...");

    await db.query(`
      TRUNCATE TABLE 
        order_items, orders, menu_item_translations, menu_items,
        menu_categories_translations, menu_categories,
        table_translations, tables,
        bookings, customers, users
      RESTART IDENTITY CASCADE
    `);

    console.log("Rensade befintlig data");

    // Users
    const userIds: number[] = [];
    for (const u of usersData) {
      const res = await db.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [u.first_name, u.last_name, u.email, u.password_hash, u.role]
      );
      userIds.push(res.rows[0].id);
    }

    // Customers
    const customerIds: number[] = [];
    for (const c of customersData) {
      const res = await db.query(
        `INSERT INTO customers (first_name, last_name, email, phone)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [c.first_name, c.last_name, c.email, c.phone]
      );
      customerIds.push(res.rows[0].id);
    }

    // Tables + translations
    const tableIds: number[] = [];
    for (const table of tablesData) {
      const res = await db.query(
        `INSERT INTO tables (table_number, seats, available)
         VALUES ($1,$2,true) RETURNING id`,
        [table.table_number, table.seats]
      );
      const tableId = res.rows[0].id;
      tableIds.push(tableId);

      for (const [locale, location] of Object.entries(table.translations)) {
        await db.query(
          `INSERT INTO table_translations (table_id, locale, location)
           VALUES ($1,$2,$3)`,
          [tableId, locale, location]
        );
      }
    }

    // Categories + translations
    const categoryIds: number[] = [];
    for (const category of categoriesData) {
      const res = await db.query(`INSERT INTO menu_categories DEFAULT VALUES RETURNING id`);
      const categoryId = res.rows[0].id;
      categoryIds.push(categoryId);

      for (const [locale, { name, description }] of Object.entries(category.translations)) {
        await db.query(
          `INSERT INTO menu_categories_translations (category_id, locale, name, description)
           VALUES ($1,$2,$3,$4)`,
          [categoryId, locale, name, description]
        );
      }
    }

    // Menu items + translations
    const menuItemIds: number[] = [];
    for (const item of menuItemsData) {
      const res = await db.query(
        `INSERT INTO menu_items (category_id, price, available)
         VALUES ($1,$2,true) RETURNING id`,
        [categoryIds[item.category_index], item.price]
      );
      const itemId = res.rows[0].id;
      menuItemIds.push(itemId);

      for (const [locale, { name, description }] of Object.entries(item.translations)) {
        await db.query(
          `INSERT INTO menu_item_translations (item_id, locale, name, description)
           VALUES ($1,$2,$3,$4)`,
          [itemId, locale, name, description]
        );
      }
    }

    // Bookings
    const bookingIds: number[] = [];
    for (const b of bookingsData) {
      const res = await db.query(
        `INSERT INTO bookings (customer_id, table_id, booking_time, guests, status)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [customerIds[b.customer_index], tableIds[b.table_index], b.booking_time, b.guests, b.status]
      );
      bookingIds.push(res.rows[0].id);
    }

    // Orders
    const orderIds: number[] = [];
    for (const o of ordersData) {
      const res = await db.query(
        `INSERT INTO orders (customer_id, booking_id, status)
         VALUES ($1,$2,$3) RETURNING id`,
        [customerIds[o.customer_index], bookingIds[o.booking_index], o.status]
      );
      orderIds.push(res.rows[0].id);
    }

    // Order items
    for (const oi of orderItemsData) {
      await db.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order)
         VALUES ($1,$2,$3,$4)`,
        [orderIds[oi.order_index], menuItemIds[oi.menu_item_index], oi.quantity, oi.price_at_order]
      );
    }

    console.log("Seeding klart!");
  } catch (error) {
    console.error("Fel vid seeding:", error);
  } finally {
    await db.end();
  }
}

seed();