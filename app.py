import json
import sqlite3
from datetime import datetime
from functools import wraps
from pathlib import Path
from flask import Flask, jsonify, request, g, render_template

BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / "quercus.db"

app = Flask(__name__)

ROLE_PERMS = {
    "admin": {"create", "read", "update", "delete"},
    "editor": {"create", "read", "update"},
    "viewer": {"read"},
}

MODULES = {
    "proveedores": "suppliers",
    "proveedor_medios_pago": "supplier_payment_methods",
    "clientes": "clients",
    "depositos": "warehouses",
    "items": "items",
    "categorias": "categories",
    "unidades": "units",
}


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def now_iso():
    return datetime.utcnow().isoformat(timespec="seconds")


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            deleted_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(company_id, name),
            FOREIGN KEY(company_id) REFERENCES companies(id)
        );

        CREATE TABLE IF NOT EXISTS units (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            symbol TEXT NOT NULL,
            deleted_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(company_id, symbol),
            FOREIGN KEY(company_id) REFERENCES companies(id)
        );

        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            tax_id TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            deleted_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(company_id, tax_id),
            FOREIGN KEY(company_id) REFERENCES companies(id)
        );

        CREATE TABLE IF NOT EXISTS supplier_payment_methods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            supplier_id INTEGER NOT NULL,
            method_type TEXT NOT NULL,
            alias TEXT NOT NULL,
            details TEXT,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            valid_from TEXT NOT NULL,
            valid_to TEXT,
            deleted_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(company_id) REFERENCES companies(id),
            FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
        );

        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            tax_id TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            deleted_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(company_id, tax_id),
            FOREIGN KEY(company_id) REFERENCES companies(id)
        );

        CREATE TABLE IF NOT EXISTS warehouses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            location TEXT,
            deleted_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(company_id, name),
            FOREIGN KEY(company_id) REFERENCES companies(id)
        );

        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            item_type TEXT NOT NULL,
            name TEXT NOT NULL,
            sku TEXT NOT NULL,
            category_id INTEGER,
            unit_id INTEGER,
            deleted_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(company_id, sku),
            FOREIGN KEY(company_id) REFERENCES companies(id),
            FOREIGN KEY(category_id) REFERENCES categories(id),
            FOREIGN KEY(unit_id) REFERENCES units(id)
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            module TEXT NOT NULL,
            action TEXT NOT NULL,
            record_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            old_values TEXT,
            new_values TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(company_id) REFERENCES companies(id)
        );
        """
    )
    company = db.execute("SELECT id FROM companies WHERE id = 1").fetchone()
    if not company:
        db.execute("INSERT INTO companies (id, name) VALUES (1, 'Quercus Demo SA')")
    db.commit()
    db.close()


def get_role():
    role = request.headers.get("X-Role", "admin").lower()
    if role not in ROLE_PERMS:
        return "viewer"
    return role


def require_permission(action):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            role = get_role()
            if action not in ROLE_PERMS[role]:
                return jsonify({"error": f"Rol '{role}' sin permiso '{action}'"}), 403
            return func(*args, **kwargs)

        return wrapper

    return decorator


def parse_company_id():
    company_id = request.args.get("company_id") or request.json.get("company_id") if request.is_json else None
    try:
        cid = int(company_id or 1)
    except ValueError:
        return None
    return cid


def validate_required(data, fields):
    errors = {}
    for f in fields:
        if not data.get(f):
            errors[f] = "Campo requerido"
    return errors


def log_audit(db, company_id, module, action, record_id, old_values, new_values):
    db.execute(
        """INSERT INTO audit_logs(company_id,module,action,record_id,role,old_values,new_values,created_at)
        VALUES(?,?,?,?,?,?,?,?)""",
        (
            company_id,
            module,
            action,
            record_id,
            get_role(),
            json.dumps(old_values) if old_values else None,
            json.dumps(new_values) if new_values else None,
            now_iso(),
        ),
    )


def list_records(table, search_cols):
    db = get_db()
    company_id = parse_company_id() or 1
    q = request.args.get("q", "").strip()
    sort = request.args.get("sort", "id")
    direction = request.args.get("direction", "asc").lower()
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(max(int(request.args.get("per_page", 10)), 1), 100)

    allowed_sort = {"id", "name", "created_at", "updated_at", "valid_from", "item_type"}
    if sort not in allowed_sort:
        sort = "id"
    if direction not in {"asc", "desc"}:
        direction = "asc"

    where = ["company_id=?", "deleted_at IS NULL"]
    params = [company_id]
    if q:
        where.append("(" + " OR ".join([f"{col} LIKE ?" for col in search_cols]) + ")")
        params.extend([f"%{q}%"] * len(search_cols))

    where_sql = " AND ".join(where)
    total = db.execute(f"SELECT COUNT(*) AS c FROM {table} WHERE {where_sql}", params).fetchone()["c"]
    offset = (page - 1) * per_page

    rows = db.execute(
        f"SELECT * FROM {table} WHERE {where_sql} ORDER BY {sort} {direction} LIMIT ? OFFSET ?",
        params + [per_page, offset],
    ).fetchall()
    return jsonify(
        {
            "data": [dict(r) for r in rows],
            "meta": {"page": page, "per_page": per_page, "total": total},
        }
    )


def get_record_or_404(table, record_id, company_id):
    db = get_db()
    row = db.execute(
        f"SELECT * FROM {table} WHERE id=? AND company_id=? AND deleted_at IS NULL",
        (record_id, company_id),
    ).fetchone()
    return row


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/audit_logs")
@require_permission("read")
def audit_logs():
    db = get_db()
    company_id = parse_company_id() or 1
    rows = db.execute(
        "SELECT * FROM audit_logs WHERE company_id=? ORDER BY id DESC LIMIT 200", (company_id,)
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/catalogs", methods=["GET"])
@require_permission("read")
def catalogs_list():
    db = get_db()
    company_id = parse_company_id() or 1
    categories = db.execute(
        "SELECT id,name FROM categories WHERE company_id=? AND deleted_at IS NULL ORDER BY name",
        (company_id,),
    ).fetchall()
    units = db.execute(
        "SELECT id,name,symbol FROM units WHERE company_id=? AND deleted_at IS NULL ORDER BY name",
        (company_id,),
    ).fetchall()
    return jsonify({
        "categories": [dict(r) for r in categories],
        "units": [dict(r) for r in units],
    })


@app.route("/api/categories", methods=["GET", "POST"])
@require_permission("read")
def categories_list_create():
    if request.method == "GET":
        return list_records("categories", ["name"])
    if "create" not in ROLE_PERMS[get_role()]:
        return jsonify({"error": "Sin permiso"}), 403
    data = request.get_json(force=True)
    errors = validate_required(data, ["name", "company_id"])
    if errors:
        return jsonify({"errors": errors}), 400
    db = get_db()
    ts = now_iso()
    try:
        cur = db.execute(
            "INSERT INTO categories(company_id,name,created_at,updated_at) VALUES(?,?,?,?)",
            (data["company_id"], data["name"].strip(), ts, ts),
        )
        rid = cur.lastrowid
        log_audit(db, data["company_id"], "categorias", "create", rid, None, data)
        db.commit()
    except sqlite3.IntegrityError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"id": rid}), 201


@app.route("/api/categories/<int:record_id>", methods=["PUT", "DELETE"])
def categories_update_delete(record_id):
    company_id = parse_company_id() or 1
    db = get_db()
    row = get_record_or_404("categories", record_id, company_id)
    if not row:
        return jsonify({"error": "No encontrado"}), 404
    old = dict(row)
    if request.method == "PUT":
        if "update" not in ROLE_PERMS[get_role()]:
            return jsonify({"error": "Sin permiso"}), 403
        data = request.get_json(force=True)
        if not data.get("name"):
            return jsonify({"errors": {"name": "Campo requerido"}}), 400
        db.execute("UPDATE categories SET name=?,updated_at=? WHERE id=?", (data["name"], now_iso(), record_id))
        log_audit(db, company_id, "categorias", "update", record_id, old, data)
    else:
        if "delete" not in ROLE_PERMS[get_role()]:
            return jsonify({"error": "Sin permiso"}), 403
        db.execute("UPDATE categories SET deleted_at=?,updated_at=? WHERE id=?", (now_iso(), now_iso(), record_id))
        log_audit(db, company_id, "categorias", "soft_delete", record_id, old, None)
    db.commit()
    return jsonify({"ok": True})


@app.route("/api/units", methods=["GET", "POST"])
def units_list_create():
    if request.method == "GET":
        return require_permission("read")(lambda: list_records("units", ["name", "symbol"]))()
    if "create" not in ROLE_PERMS[get_role()]:
        return jsonify({"error": "Sin permiso"}), 403
    data = request.get_json(force=True)
    errors = validate_required(data, ["name", "symbol", "company_id"])
    if errors:
        return jsonify({"errors": errors}), 400
    db = get_db()
    ts = now_iso()
    try:
        cur = db.execute(
            "INSERT INTO units(company_id,name,symbol,created_at,updated_at) VALUES(?,?,?,?,?)",
            (data["company_id"], data["name"], data["symbol"], ts, ts),
        )
        rid = cur.lastrowid
        log_audit(db, data["company_id"], "unidades", "create", rid, None, data)
        db.commit()
    except sqlite3.IntegrityError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"id": rid}), 201


@app.route("/api/units/<int:record_id>", methods=["PUT", "DELETE"])
def units_update_delete(record_id):
    company_id = parse_company_id() or 1
    db = get_db()
    row = get_record_or_404("units", record_id, company_id)
    if not row:
        return jsonify({"error": "No encontrado"}), 404
    old = dict(row)
    if request.method == "PUT":
        if "update" not in ROLE_PERMS[get_role()]:
            return jsonify({"error": "Sin permiso"}), 403
        data = request.get_json(force=True)
        errors = validate_required(data, ["name", "symbol"])
        if errors:
            return jsonify({"errors": errors}), 400
        db.execute("UPDATE units SET name=?,symbol=?,updated_at=? WHERE id=?", (data["name"], data["symbol"], now_iso(), record_id))
        log_audit(db, company_id, "unidades", "update", record_id, old, data)
    else:
        if "delete" not in ROLE_PERMS[get_role()]:
            return jsonify({"error": "Sin permiso"}), 403
        db.execute("UPDATE units SET deleted_at=?,updated_at=? WHERE id=?", (now_iso(), now_iso(), record_id))
        log_audit(db, company_id, "unidades", "soft_delete", record_id, old, None)
    db.commit()
    return jsonify({"ok": True})


def generic_entity_routes(name, table, required_fields, search_cols, extra_validator=None):
    list_endpoint = f"/{name}"

    @app.route(f"/api{list_endpoint}", methods=["GET", "POST"], endpoint=f"{name}_list_create")
    def list_create():
        if request.method == "GET":
            return require_permission("read")(lambda: list_records(table, search_cols))()

        if "create" not in ROLE_PERMS[get_role()]:
            return jsonify({"error": "Sin permiso"}), 403
        data = request.get_json(force=True)
        errors = validate_required(data, required_fields + ["company_id"])
        if extra_validator:
            extra = extra_validator(data, True)
            errors.update(extra)
        if errors:
            return jsonify({"errors": errors}), 400
        cols = ["company_id"] + required_fields
        vals = [data.get(c) for c in cols]
        cols += ["created_at", "updated_at"]
        vals += [now_iso(), now_iso()]
        placeholders = ",".join(["?"] * len(cols))
        db = get_db()
        try:
            cur = db.execute(f"INSERT INTO {table}({','.join(cols)}) VALUES({placeholders})", vals)
            rid = cur.lastrowid
            log_audit(db, data["company_id"], name, "create", rid, None, data)
            db.commit()
            return jsonify({"id": rid}), 201
        except sqlite3.IntegrityError as e:
            return jsonify({"error": str(e)}), 400

    @app.route(f"/api{list_endpoint}/<int:record_id>", methods=["PUT", "DELETE"], endpoint=f"{name}_update_delete")
    def update_delete(record_id):
        company_id = parse_company_id() or 1
        db = get_db()
        row = get_record_or_404(table, record_id, company_id)
        if not row:
            return jsonify({"error": "No encontrado"}), 404
        old = dict(row)
        if request.method == "PUT":
            if "update" not in ROLE_PERMS[get_role()]:
                return jsonify({"error": "Sin permiso"}), 403
            data = request.get_json(force=True)
            errors = validate_required(data, required_fields)
            if extra_validator:
                extra = extra_validator(data, False)
                errors.update(extra)
            if errors:
                return jsonify({"errors": errors}), 400
            set_clause = ",".join([f"{c}=?" for c in required_fields] + ["updated_at=?"])
            params = [data[c] for c in required_fields] + [now_iso(), record_id]
            db.execute(f"UPDATE {table} SET {set_clause} WHERE id=?", params)
            log_audit(db, company_id, name, "update", record_id, old, data)
        else:
            if "delete" not in ROLE_PERMS[get_role()]:
                return jsonify({"error": "Sin permiso"}), 403
            db.execute(f"UPDATE {table} SET deleted_at=?,updated_at=? WHERE id=?", (now_iso(), now_iso(), record_id))
            log_audit(db, company_id, name, "soft_delete", record_id, old, None)
        db.commit()
        return jsonify({"ok": True})


def validate_payment(data, creating):
    errors = {}
    for field in ["supplier_id", "method_type", "alias", "valid_from"]:
        if not data.get(field):
            errors[field] = "Campo requerido"
    valid_to = data.get("valid_to")
    if valid_to and data.get("valid_from") and valid_to < data.get("valid_from"):
        errors["valid_to"] = "Debe ser mayor o igual a valid_from"
    return errors


generic_entity_routes("proveedores", "suppliers", ["name", "tax_id", "email", "phone"], ["name", "tax_id", "email"])
generic_entity_routes("clientes", "clients", ["name", "tax_id", "email", "phone"], ["name", "tax_id", "email"])
generic_entity_routes("depositos", "warehouses", ["name", "location"], ["name", "location"])
generic_entity_routes("items", "items", ["item_type", "name", "sku", "category_id", "unit_id"], ["name", "sku", "item_type"])


@app.route("/api/proveedor_medios_pago", methods=["GET", "POST"])
def medios_pago_list_create():
    if request.method == "GET":
        db = get_db()
        company_id = parse_company_id() or 1
        supplier_id = request.args.get("supplier_id")
        q = request.args.get("q", "")
        where = ["spm.company_id=?", "spm.deleted_at IS NULL"]
        params = [company_id]
        if supplier_id:
            where.append("spm.supplier_id=?")
            params.append(int(supplier_id))
        if q:
            where.append("(spm.alias LIKE ? OR spm.method_type LIKE ?)")
            params.extend([f"%{q}%", f"%{q}%"])

        rows = db.execute(
            f"""SELECT spm.*, s.name as supplier_name FROM supplier_payment_methods spm
            JOIN suppliers s ON s.id=spm.supplier_id
            WHERE {' AND '.join(where)}
            ORDER BY spm.is_favorite DESC, spm.valid_from DESC""",
            params,
        ).fetchall()
        return jsonify({"data": [dict(r) for r in rows], "meta": {"total": len(rows)}})

    if "create" not in ROLE_PERMS[get_role()]:
        return jsonify({"error": "Sin permiso"}), 403
    data = request.get_json(force=True)
    errors = validate_required(data, ["company_id"])
    errors.update(validate_payment(data, True))
    if errors:
        return jsonify({"errors": errors}), 400
    db = get_db()
    supplier = db.execute(
        "SELECT id FROM suppliers WHERE id=? AND company_id=? AND deleted_at IS NULL",
        (data["supplier_id"], data["company_id"]),
    ).fetchone()
    if not supplier:
        return jsonify({"errors": {"supplier_id": "Proveedor inválido"}}), 400

    ts = now_iso()
    if data.get("is_favorite"):
        db.execute(
            "UPDATE supplier_payment_methods SET is_favorite=0,updated_at=? WHERE company_id=? AND supplier_id=? AND deleted_at IS NULL",
            (ts, data["company_id"], data["supplier_id"]),
        )
    cur = db.execute(
        """INSERT INTO supplier_payment_methods(company_id,supplier_id,method_type,alias,details,is_favorite,valid_from,valid_to,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?)""",
        (
            data["company_id"],
            data["supplier_id"],
            data["method_type"],
            data["alias"],
            data.get("details"),
            1 if data.get("is_favorite") else 0,
            data["valid_from"],
            data.get("valid_to"),
            ts,
            ts,
        ),
    )
    rid = cur.lastrowid
    log_audit(db, data["company_id"], "proveedor_medios_pago", "create", rid, None, data)
    db.commit()
    return jsonify({"id": rid}), 201


@app.route("/api/proveedor_medios_pago/<int:record_id>", methods=["PUT", "DELETE"])
def medios_pago_update_delete(record_id):
    company_id = parse_company_id() or 1
    db = get_db()
    row = get_record_or_404("supplier_payment_methods", record_id, company_id)
    if not row:
        return jsonify({"error": "No encontrado"}), 404
    old = dict(row)

    if request.method == "PUT":
        if "update" not in ROLE_PERMS[get_role()]:
            return jsonify({"error": "Sin permiso"}), 403
        data = request.get_json(force=True)
        errors = validate_payment(data, False)
        if errors:
            return jsonify({"errors": errors}), 400
        if data.get("is_favorite"):
            db.execute(
                "UPDATE supplier_payment_methods SET is_favorite=0,updated_at=? WHERE company_id=? AND supplier_id=? AND deleted_at IS NULL",
                (now_iso(), company_id, data["supplier_id"]),
            )
        db.execute(
            """UPDATE supplier_payment_methods SET supplier_id=?,method_type=?,alias=?,details=?,is_favorite=?,valid_from=?,valid_to=?,updated_at=?
            WHERE id=?""",
            (
                data["supplier_id"],
                data["method_type"],
                data["alias"],
                data.get("details"),
                1 if data.get("is_favorite") else 0,
                data["valid_from"],
                data.get("valid_to"),
                now_iso(),
                record_id,
            ),
        )
        log_audit(db, company_id, "proveedor_medios_pago", "update", record_id, old, data)
    else:
        if "delete" not in ROLE_PERMS[get_role()]:
            return jsonify({"error": "Sin permiso"}), 403
        db.execute(
            "UPDATE supplier_payment_methods SET deleted_at=?,updated_at=? WHERE id=?",
            (now_iso(), now_iso(), record_id),
        )
        log_audit(db, company_id, "proveedor_medios_pago", "soft_delete", record_id, old, None)
    db.commit()
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


init_db()
