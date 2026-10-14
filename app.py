
from flask import Flask, jsonify, request, send_from_directory
import sqlite3
import os

app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "qr_dine.db")

def get_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db

def init_db():
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS menu (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price INTEGER NOT NULL
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                dish TEXT NOT NULL,
                price INTEGER NOT NULL
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cafe_name TEXT NOT NULL,
                email TEXT NOT NULL,
                message TEXT
            )
        """)
        if db.execute("SELECT COUNT(*) FROM menu").fetchone()[0] == 0:
            db.executemany(
                "INSERT INTO menu (name, price) VALUES (?, ?)",
                [
                    ("Бешбармак", 3500),
                    ("Лагман", 2200),
                    ("Цезарь с курицей", 2400),
                    ("Самса", 700),
                    ("Шұбат", 900),
                    ("Чай с лимоном", 800),
                    ("Палау", 1800),
                    ("Манты", 2300)
                ]
            )

init_db()

@app.route("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(BASE_DIR, filename)

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "project": "QR DINE"})

@app.route("/api/menu")
def menu():
    with get_db() as db:
        items = db.execute("SELECT * FROM menu").fetchall()
        return jsonify([dict(item) for item in items])

@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json(silent=True) or {}
    name = str(data.get("customer_name", "")).strip()
    dish = str(data.get("dish", "")).strip()

    if not name or not dish:
        return jsonify({"error": "Заполните данные заказа"}), 400

    with get_db() as db:
        item = db.execute(
            "SELECT price FROM menu WHERE name = ?", (dish,)
        ).fetchone()
        if item is None:
            return jsonify({"error": "Блюдо не найдено"}), 404
        cursor = db.execute(
            "INSERT INTO orders (customer_name, dish, price) VALUES (?, ?, ?)",
            (name, dish, item["price"])
        )
        order_id = cursor.lastrowid

    return jsonify({"success": True, "order_id": order_id}), 201

@app.route("/api/applications", methods=["POST"])
def create_application():
    data = request.get_json(silent=True) or {}
    cafe = str(data.get("cafe_name", "")).strip()
    email = str(data.get("email", "")).strip()
    message = str(data.get("message", "")).strip()

    if not cafe or not email:
        return jsonify({"error": "Заполните обязательные поля"}), 400

    with get_db() as db:
        db.execute(
            "INSERT INTO applications (cafe_name, email, message) VALUES (?, ?, ?)",
            (cafe, email, message)
        )

    return jsonify({"success": True}), 201
    
@app.route("/api/orders", methods=["GET"])
def get_orders():
    with get_db() as db:
        orders = db.execute(
            "SELECT id, customer_name, dish, price FROM orders ORDER BY id DESC"
        ).fetchall()
        return jsonify([dict(order) for order in orders])


if __name__ == "__main__":
    app.run(debug=True)
    
