from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "quercus.db"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def rows_to_json(rows):
    return [dict(r) for r in rows]


def init_db() -> None:
    conn = get_db()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS companies (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS deposits (id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, sku TEXT NOT NULL, name TEXT NOT NULL,
            item_type TEXT NOT NULL CHECK(item_type IN ('raw_material','product','service')),
            stock_managed INTEGER NOT NULL DEFAULT 0, base_unit TEXT NOT NULL, last_cost REAL NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS purchases (
            id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, supplier_id INTEGER NOT NULL, deposit_id INTEGER NOT NULL,
            document_number TEXT, purchase_date TEXT NOT NULL, notes TEXT, total_amount REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS purchase_items (
            id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, purchase_id INTEGER NOT NULL, item_id INTEGER NOT NULL,
            quantity REAL NOT NULL, unit TEXT NOT NULL, unit_factor REAL NOT NULL, base_quantity REAL NOT NULL,
            unit_cost REAL NOT NULL, subtotal REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS stock_movements (
            id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, item_id INTEGER NOT NULL, deposit_id INTEGER NOT NULL,
            movement_date TEXT NOT NULL, movement_type TEXT NOT NULL CHECK(movement_type IN ('in','out')),
            quantity REAL NOT NULL, unit_cost REAL NOT NULL, reference_type TEXT NOT NULL, reference_id INTEGER NOT NULL, notes TEXT
        );
        CREATE TABLE IF NOT EXISTS supplier_account_movements (
            id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, supplier_id INTEGER NOT NULL,
            movement_date TEXT NOT NULL, movement_type TEXT NOT NULL CHECK(movement_type IN ('debit','credit')),
            amount REAL NOT NULL, reference_type TEXT NOT NULL, reference_id INTEGER NOT NULL, notes TEXT
        );
        """
    )
    conn.execute("INSERT OR IGNORE INTO companies(id,name) VALUES (1,'Quercus Demo')")
    conn.execute("INSERT OR IGNORE INTO suppliers(id,company_id,name) VALUES (1,1,'Proveedor Norte')")
    conn.execute("INSERT OR IGNORE INTO suppliers(id,company_id,name) VALUES (2,1,'Servicios Sur')")
    conn.execute("INSERT OR IGNORE INTO deposits(id,company_id,name) VALUES (1,1,'Depósito Central')")
    conn.execute("INSERT OR IGNORE INTO deposits(id,company_id,name) VALUES (2,1,'Depósito Planta')")
    conn.execute("INSERT OR IGNORE INTO items(id,company_id,sku,name,item_type,stock_managed,base_unit,last_cost) VALUES (1,1,'MAT-001','Harina 000','raw_material',1,'kg',1200)")
    conn.execute("INSERT OR IGNORE INTO items(id,company_id,sku,name,item_type,stock_managed,base_unit,last_cost) VALUES (2,1,'PRO-001','Pan lactal','product',1,'unidad',900)")
    conn.execute("INSERT OR IGNORE INTO items(id,company_id,sku,name,item_type,stock_managed,base_unit,last_cost) VALUES (3,1,'SER-001','Flete refrigerado','service',0,'servicio',15000)")
    conn.commit()
    conn.close()


def json_response(handler: BaseHTTPRequestHandler, status: int, payload):
    data = json.dumps(payload).encode()
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


class Handler(BaseHTTPRequestHandler):
    def _serve_file(self, relative: str, content_type: str):
        path = BASE_DIR / relative
        if not path.exists():
            self.send_error(404)
            return
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        if path == "/":
            return self._serve_file("templates/index.html", "text/html; charset=utf-8")
        if path == "/stock":
            return self._serve_file("templates/stock.html", "text/html; charset=utf-8")
        if path == "/reports":
            return self._serve_file("templates/reports.html", "text/html; charset=utf-8")
        if path == "/static/app.js":
            return self._serve_file("static/app.js", "application/javascript; charset=utf-8")
        if path == "/static/style.css":
            return self._serve_file("static/style.css", "text/css; charset=utf-8")

        conn = get_db()
        company_id = int(qs.get("company_id", [1])[0])

        if path == "/api/masters":
            payload = {
                "suppliers": rows_to_json(conn.execute("SELECT id,name FROM suppliers WHERE company_id=?", (company_id,)).fetchall()),
                "items": rows_to_json(conn.execute("SELECT id,sku,name,item_type,stock_managed,base_unit,last_cost FROM items WHERE company_id=?", (company_id,)).fetchall()),
                "deposits": rows_to_json(conn.execute("SELECT id,name FROM deposits WHERE company_id=?", (company_id,)).fetchall()),
            }
            conn.close()
            return json_response(self, 200, payload)

        if path == "/api/reports/stock-by-deposit":
            rows = conn.execute("""
                SELECT d.name AS deposit, i.sku, i.name AS item,
                COALESCE(SUM(CASE WHEN sm.movement_type='in' THEN sm.quantity ELSE -sm.quantity END),0) AS stock_qty,
                i.base_unit
                FROM items i
                CROSS JOIN deposits d
                LEFT JOIN stock_movements sm ON sm.item_id=i.id AND sm.deposit_id=d.id AND sm.company_id=i.company_id
                WHERE i.company_id=? AND d.company_id=? AND i.stock_managed=1
                GROUP BY d.name, i.sku, i.name, i.base_unit ORDER BY d.name, i.sku
            """, (company_id, company_id)).fetchall()
            conn.close()
            return json_response(self, 200, rows_to_json(rows))

        if path == "/api/reports/kardex":
            item_id = qs.get("item_id", [None])[0]
            query = """
                SELECT sm.id, sm.movement_date, i.sku, i.name AS item, d.name AS deposit,
                       sm.movement_type, sm.quantity, sm.unit_cost, sm.reference_type, sm.reference_id
                FROM stock_movements sm JOIN items i ON i.id=sm.item_id JOIN deposits d ON d.id=sm.deposit_id
                WHERE sm.company_id=?
            """
            params = [company_id]
            if item_id:
                query += " AND sm.item_id=?"
                params.append(int(item_id))
            query += " ORDER BY sm.movement_date, sm.id"
            rows = conn.execute(query, params).fetchall()
            conn.close()
            return json_response(self, 200, rows_to_json(rows))

        if path == "/api/reports/stock-valued":
            rows = conn.execute("""
                SELECT d.name AS deposit, i.sku, i.name AS item,
                COALESCE(SUM(CASE WHEN sm.movement_type='in' THEN sm.quantity ELSE -sm.quantity END),0) AS stock_qty,
                i.last_cost,
                COALESCE(SUM(CASE WHEN sm.movement_type='in' THEN sm.quantity ELSE -sm.quantity END),0) * i.last_cost AS stock_value
                FROM items i
                CROSS JOIN deposits d
                LEFT JOIN stock_movements sm ON sm.item_id=i.id AND sm.deposit_id=d.id AND sm.company_id=i.company_id
                WHERE i.company_id=? AND d.company_id=? AND i.stock_managed=1
                GROUP BY d.name, i.sku, i.name, i.last_cost ORDER BY d.name, i.sku
            """, (company_id, company_id)).fetchall()
            conn.close()
            return json_response(self, 200, rows_to_json(rows))

        if path == "/api/reports/purchases-by-period":
            date_from = qs.get("from", ["1900-01-01"])[0]
            date_to = qs.get("to", ["2999-12-31"])[0]
            rows = conn.execute("""
                SELECT purchase_date, COUNT(*) AS purchase_count, SUM(total_amount) AS total_amount
                FROM purchases WHERE company_id=? AND purchase_date BETWEEN ? AND ?
                GROUP BY purchase_date ORDER BY purchase_date
            """, (company_id, date_from, date_to)).fetchall()
            conn.close()
            return json_response(self, 200, rows_to_json(rows))

        if path == "/api/reports/purchases-by-supplier":
            rows = conn.execute("""
                SELECT s.name AS supplier, COUNT(p.id) AS purchase_count, COALESCE(SUM(p.total_amount),0) AS total_amount
                FROM suppliers s LEFT JOIN purchases p ON p.supplier_id=s.id AND p.company_id=s.company_id
                WHERE s.company_id=? GROUP BY s.name ORDER BY total_amount DESC
            """, (company_id,)).fetchall()
            conn.close()
            return json_response(self, 200, rows_to_json(rows))

        conn.close()
        self.send_error(404)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/purchases":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length).decode() or "{}")

        company_id = int(payload["company_id"])
        supplier_id = int(payload["supplier_id"])
        deposit_id = int(payload["deposit_id"])
        purchase_date = payload.get("purchase_date") or datetime.utcnow().date().isoformat()
        document_number = payload.get("document_number")
        notes = payload.get("notes")
        items = payload.get("items", [])
        if not items:
            return json_response(self, 400, {"error": "items is required"})

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO purchases(company_id,supplier_id,deposit_id,document_number,purchase_date,notes,total_amount,created_at) VALUES (?,?,?,?,?,?,0,?)",
            (company_id, supplier_id, deposit_id, document_number, purchase_date, notes, datetime.utcnow().isoformat()),
        )
        purchase_id = cur.lastrowid
        total = 0.0

        for line in items:
            item_id = int(line["item_id"])
            quantity = float(line["quantity"])
            unit_factor = float(line.get("unit_factor", 1))
            base_qty = quantity * unit_factor
            unit_cost = float(line["unit_cost"])
            subtotal = base_qty * unit_cost
            total += subtotal

            item = conn.execute("SELECT item_type,stock_managed FROM items WHERE id=? AND company_id=?", (item_id, company_id)).fetchone()
            if not item:
                conn.rollback(); conn.close()
                return json_response(self, 404, {"error": f"item {item_id} not found"})

            cur.execute(
                "INSERT INTO purchase_items(company_id,purchase_id,item_id,quantity,unit,unit_factor,base_quantity,unit_cost,subtotal) VALUES (?,?,?,?,?,?,?,?,?)",
                (company_id, purchase_id, item_id, quantity, line["unit"], unit_factor, base_qty, unit_cost, subtotal),
            )
            cur.execute("UPDATE items SET last_cost=? WHERE id=?", (unit_cost, item_id))

            if int(item["stock_managed"]) == 1 and item["item_type"] != "service":
                cur.execute(
                    "INSERT INTO stock_movements(company_id,item_id,deposit_id,movement_date,movement_type,quantity,unit_cost,reference_type,reference_id,notes) VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (company_id, item_id, deposit_id, purchase_date, "in", base_qty, unit_cost, "purchase", purchase_id, document_number),
                )

        cur.execute("UPDATE purchases SET total_amount=? WHERE id=?", (total, purchase_id))
        cur.execute(
            "INSERT INTO supplier_account_movements(company_id,supplier_id,movement_date,movement_type,amount,reference_type,reference_id,notes) VALUES (?,?,?,?,?,?,?,?)",
            (company_id, supplier_id, purchase_date, "debit", total, "purchase", purchase_id, document_number),
        )
        conn.commit(); conn.close()
        return json_response(self, 201, {"purchase_id": purchase_id, "total_amount": total})


def run():
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", 8000), Handler)
    print("Server running on http://0.0.0.0:8000")
    server.serve_forever()


if __name__ == "__main__":
    run()
