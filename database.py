import sqlite3

db = sqlite3.connect("qr_dine.db")

cursor = db.cursor()


cursor.execute("""
CREATE TABLE IF NOT EXISTS cafes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    address TEXT
)
""")


cursor.execute("""
CREATE TABLE IF NOT EXISTS menu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cafe_id INTEGER,
    name TEXT,
    price INTEGER
)
""")


cursor.execute("""
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cafe_id INTEGER,
    customer_name TEXT,
    dish TEXT,
    price INTEGER
)
""")


cursor.execute("""
INSERT INTO cafes (name, address)
VALUES ('QR DINE Cafe', 'Алматы')
""")


cursor.execute("""
INSERT INTO menu (cafe_id, name, price)
VALUES
(1, 'Бешбармак', 3500),
(1, 'Лагман', 2200),
(1, 'Самса', 700),
(1, 'Манты', 2300)
""")


db.commit()

db.close()

print("База данных создана!")
