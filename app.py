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
    
