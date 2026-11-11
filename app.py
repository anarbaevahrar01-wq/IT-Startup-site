
from flask import Flask, jsonify, request, send_from_directory, session
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os
app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "qr_dine.db")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "local-development-only")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("RENDER") == "true"

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






        
        
        db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL
            )
        """)
        
        # Volidam кафесінің 6 жеке кабинкасы
        db.execute("""
            CREATE TABLE IF NOT EXISTS cabins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cafe_id INTEGER NOT NULL,
                cabin_number INTEGER NOT NULL,
                UNIQUE(cafe_id, cabin_number)
            )
        """)

        # Existing database migration: retain old orders, add cabin/status columns.
        order_columns = {row["name"] for row in db.execute("PRAGMA table_info(orders)")}
        if "cabin_id" not in order_columns:
            db.execute("ALTER TABLE orders ADD COLUMN cabin_id INTEGER")
        if "status" not in order_columns:
            db.execute("ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'new'")

        # Cafe 1 is Volidam; rename only the original placeholder name.
        db.execute("""
            CREATE TABLE IF NOT EXISTS cafes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                address TEXT,
                image TEXT
            )
        """)
        existing_cafe = db.execute("SELECT name FROM cafes WHERE id = 1").fetchone()
        if existing_cafe is None:
            db.execute("INSERT INTO cafes (id, name, address, image) VALUES (1, 'Volidam', '', '')")
        elif existing_cafe["name"] == "QR DINE Cafe":
            db.execute("UPDATE cafes SET name = 'Volidam' WHERE id = 1")

        for number in range(1, 7):
            db.execute("""
                INSERT OR IGNORE INTO cabins
                (cafe_id, cabin_number)
                VALUES (?, ?)
            """, (1, number))


        
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
    # Never expose database, Python code or environment files over HTTP.
    if filename.startswith(".") or "/." in filename or filename.endswith((".db", ".sqlite", ".sqlite3", ".py", ".env")):
        return jsonify({"error": "Not found"}), 404
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
    cabin_number = data.get("cabin_number")
    cafe_id = data.get("cafe_id", 1)

    if not name or not dish:
        return jsonify({"error": "Аты-жөніңіз бен тағамды енгізіңіз"}), 400
    if len(name) > 100 or len(dish) > 150:
        return jsonify({"error": "Мәтін тым ұзын"}), 400
    if type(cafe_id) is not int or cafe_id != 1:
        return jsonify({"error": "Қазір тек Volidam қолжетімді"}), 400
    if type(cabin_number) is not int or not 1 <= cabin_number <= 6:
        return jsonify({"error": "Кабинка нөмірін 1–6 аралығында таңдаңыз"}), 400

    with get_db() as db:
        cabin = db.execute(
            "SELECT id FROM cabins WHERE cafe_id = ? AND cabin_number = ?",
            (cafe_id, cabin_number)
        ).fetchone()
        if cabin is None:
            return jsonify({"error": "Кабинка табылмады"}), 404
        item = db.execute("SELECT price FROM menu WHERE name = ?", (dish,)).fetchone()
        if item is None:
            return jsonify({"error": "Тағам табылмады"}), 404
        cursor = db.execute(
            "INSERT INTO orders (customer_name, dish, price, cabin_id, status) VALUES (?, ?, ?, ?, 'new')",
            (name, dish, item["price"], cabin["id"])
        )
        order_id = cursor.lastrowid

    return jsonify({"success": True, "order_id": order_id,
                    "cafe_id": cafe_id, "cabin_number": cabin_number}), 201


def is_admin():
    user_id = session.get("user_id")
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    if not user_id or not admin_email:
        return False
    with get_db() as db:
        user = db.execute("SELECT email FROM users WHERE id = ?", (user_id,)).fetchone()
    return bool(user and user["email"].lower() == admin_email)


@app.route("/api/admin/orders", methods=["GET"])
def admin_orders():
    if not is_admin():
        return jsonify({"error": "Әкімші ретінде кіріңіз"}), 403
    with get_db() as db:
        rows = db.execute("""
            SELECT o.id, o.customer_name, o.dish, o.price, o.status,
                   c.cafe_id, c.cabin_number
            FROM orders o LEFT JOIN cabins c ON o.cabin_id = c.id
            ORDER BY o.id DESC
        """).fetchall()
    return jsonify([dict(row) for row in rows])


@app.route("/api/admin/orders/<int:order_id>/status", methods=["PATCH"])
def update_order_status(order_id):
    if not is_admin():
        return jsonify({"error": "Әкімші ретінде кіріңіз"}), 403
    status = (request.get_json(silent=True) or {}).get("status")
    if status not in ("new", "preparing", "ready", "completed", "cancelled"):
        return jsonify({"error": "Мәртебе дұрыс емес"}), 400
    with get_db() as db:
        result = db.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
        if result.rowcount == 0:
            return jsonify({"error": "Тапсырыс табылмады"}), 404
    return jsonify({"success": True, "order_id": order_id, "status": status})


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
    # Keep old URL but protect customer information.
    return admin_orders()

# ---------- ТІРКЕЛУ ----------
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not name or not email or not password:
        return jsonify({"error": "Барлық өрісті толтырыңыз"}), 400

    if len(password) < 8:
        return jsonify({
            "error": "Құпиясөз кемінде 8 таңбадан тұруы керек"
        }), 400

    if "@" not in email or len(email) > 254:
        return jsonify({"error": "Email дұрыс емес"}), 400

    password_hash = generate_password_hash(password)

    try:
        with get_db() as db:
            cursor = db.execute(
                """INSERT INTO users
                   (name, email, password_hash)
                   VALUES (?, ?, ?)""",
                (name, email, password_hash)
            )
            user_id = cursor.lastrowid

    except sqlite3.IntegrityError:
        return jsonify({
            "error": "Бұл email бұрын тіркелген"
        }), 409

    session.clear()
    session["user_id"] = user_id

    return jsonify({
        "success": True,
        "message": "Тіркелу сәтті өтті",
        "user": {
            "id": user_id,
            "name": name,
            "email": email
        }
    }), 201


# ---------- ЖҮЙЕГЕ КІРУ ----------
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    with get_db() as db:
        user = db.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,)
        ).fetchone()

    if user is None or not check_password_hash(
        user["password_hash"], password
    ):
        return jsonify({
            "error": "Email немесе құпиясөз қате"
        }), 401

    session.clear()
    session["user_id"] = user["id"]

    return jsonify({
        "success": True,
        "message": "Жүйеге сәтті кірдіңіз",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    })


# ---------- ПРОФИЛЬ ----------
@app.route("/api/me", methods=["GET"])
def my_profile():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Жүйеге кіріңіз"}), 401

    with get_db() as db:
        user = db.execute(
            "SELECT id, name, email FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()

    if not user:
        session.clear()
        return jsonify({"error": "Аккаунт табылмады"}), 401

    return jsonify(dict(user))


# ---------- ШЫҒУ ----------
@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({
        "success": True,
        "message": "Аккаунттан шықтыңыз"
    })
    
@app.route("/api/admin/users", methods=["GET"])
def admin_users():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Жүйеге кіріңіз"}), 401

    with get_db() as db:
        admin = db.execute(
            "SELECT email FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()

        admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()

        if not admin or not admin_email or admin["email"].lower() != admin_email:
            return jsonify({"error": "Рұқсат жоқ"}), 403

        users = db.execute(
            "SELECT id, name, email FROM users ORDER BY id DESC"
        ).fetchall()

    return jsonify([dict(user) for user in users])
    
@app.route("/api/cafes", methods=["GET"])
def get_cafes():
    with get_db() as db:
        cafes = db.execute(
            "SELECT id, name, address, image FROM cafes WHERE id = 1"
        ).fetchall()
    return jsonify([dict(cafe) for cafe in cafes])

@app.route("/api/cabins", methods=["GET"])
def get_cabins():
    cafe_id = request.args.get("cafe_id", type=int)

    if cafe_id is None:
        return jsonify({"error": "Кафе ID қажет"}), 400

    with get_db() as db:
        cabins = db.execute("""
            SELECT id, cafe_id, cabin_number
            FROM cabins
            WHERE cafe_id = ?
            ORDER BY cabin_number
        """, (cafe_id,)).fetchall()

    return jsonify([dict(cabin) for cabin in cabins])


    


        


if __name__ == "__main__":
    app.run(debug=True)
    
