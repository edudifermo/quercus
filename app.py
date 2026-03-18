#!/usr/bin/env python3
"""Quercus security phase 1: auth + multi-tenant + roles + permissions."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from http import HTTPStatus
from http.cookies import SimpleCookie
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, Optional, Tuple
from urllib.parse import parse_qs

DB_PATH = Path("quercus.db")
SESSION_COOKIE_NAME = "quercus_session"
SESSION_TTL_SECONDS = 60 * 60 * 8

ROLE_BASE_PERMISSIONS = {
    "superadmin": {"*"},
    "admin": {
        "transactions.read",
        "transactions.write",
        "context.switch",
        "reports.company",
    },
    "analyst": {
        "transactions.read",
        "reports.company",
    },
}


class AppError(Exception):
    def __init__(self, status: int, message: str):
        self.status = status
        self.message = message
        super().__init__(message)


def now_ts() -> int:
    return int(time.time())


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 120_000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt, digest = stored.split("$", 1)
    candidate = hash_password(password, salt).split("$", 1)[1]
    return hmac.compare_digest(candidate, digest)


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                full_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                is_superadmin INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                company_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                is_default INTEGER NOT NULL DEFAULT 0,
                UNIQUE(user_id, company_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS role_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                permission TEXT NOT NULL,
                UNIQUE(role, permission)
            );

            CREATE TABLE IF NOT EXISTS user_company_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_company_id INTEGER NOT NULL,
                permission TEXT NOT NULL,
                allowed INTEGER NOT NULL,
                UNIQUE(user_company_id, permission),
                FOREIGN KEY(user_company_id) REFERENCES user_companies(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                active_company_id INTEGER,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(active_company_id) REFERENCES companies(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                created_by INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
                FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )


def seed_initial_data() -> None:
    with get_db() as conn:
        existing = conn.execute("SELECT COUNT(1) c FROM users").fetchone()["c"]
        if existing:
            return

        t = now_ts()
        conn.executemany(
            "INSERT INTO companies(code, name, created_at) VALUES(?,?,?)",
            [
                ("ACME", "Acme S.A.", t),
                ("BETA", "Beta SRL", t),
            ],
        )

        superadmin_hash = hash_password("SuperSecret!123")
        manager_hash = hash_password("Manager123!")
        analyst_hash = hash_password("Analyst123!")

        conn.execute(
            "INSERT INTO users(email, full_name, password_hash, is_superadmin, created_at) VALUES(?,?,?,?,?)",
            ("superadmin@quercus.local", "Super Admin", superadmin_hash, 1, t),
        )
        conn.execute(
            "INSERT INTO users(email, full_name, password_hash, is_superadmin, created_at) VALUES(?,?,?,?,?)",
            ("multiempresa@quercus.local", "Marta Multiempresa", manager_hash, 0, t),
        )
        conn.execute(
            "INSERT INTO users(email, full_name, password_hash, is_superadmin, created_at) VALUES(?,?,?,?,?)",
            ("analyst@quercus.local", "Ana Analyst", analyst_hash, 0, t),
        )

        acme_id = conn.execute("SELECT id FROM companies WHERE code='ACME'").fetchone()["id"]
        beta_id = conn.execute("SELECT id FROM companies WHERE code='BETA'").fetchone()["id"]
        super_id = conn.execute("SELECT id FROM users WHERE email='superadmin@quercus.local'").fetchone()["id"]
        multi_id = conn.execute("SELECT id FROM users WHERE email='multiempresa@quercus.local'").fetchone()["id"]
        analyst_id = conn.execute("SELECT id FROM users WHERE email='analyst@quercus.local'").fetchone()["id"]

        conn.executemany(
            "INSERT INTO user_companies(user_id, company_id, role, is_default) VALUES(?,?,?,?)",
            [
                (super_id, acme_id, "superadmin", 1),
                (super_id, beta_id, "superadmin", 0),
                (multi_id, acme_id, "admin", 1),
                (multi_id, beta_id, "analyst", 0),
                (analyst_id, beta_id, "analyst", 1),
            ],
        )

        conn.executemany(
            "INSERT OR IGNORE INTO role_permissions(role, permission) VALUES(?,?)",
            [
                ("admin", "context.switch"),
                ("admin", "transactions.read"),
                ("admin", "transactions.write"),
                ("admin", "reports.company"),
                ("analyst", "transactions.read"),
                ("analyst", "reports.company"),
                ("superadmin", "reports.consolidated"),
            ],
        )


def parse_json(environ: Dict[str, Any]) -> Dict[str, Any]:
    try:
        content_length = int(environ.get("CONTENT_LENGTH") or "0")
    except ValueError:
        content_length = 0
    body = environ["wsgi.input"].read(content_length) if content_length > 0 else b""
    if not body:
        return {}
    return json.loads(body.decode())


def json_response(start_response: Callable, status: HTTPStatus, payload: Dict[str, Any], cookies: Optional[Iterable[str]] = None):
    data = json.dumps(payload).encode()
    headers = [("Content-Type", "application/json"), ("Content-Length", str(len(data)))]
    for cookie in cookies or []:
        headers.append(("Set-Cookie", cookie))
    start_response(f"{status.value} {status.phrase}", headers)
    return [data]


def get_cookie(environ: Dict[str, Any], name: str) -> Optional[str]:
    cookie = SimpleCookie(environ.get("HTTP_COOKIE", ""))
    morsel = cookie.get(name)
    return morsel.value if morsel else None


def build_session_cookie(token: str, max_age: int) -> str:
    cookie = SimpleCookie()
    cookie[SESSION_COOKIE_NAME] = token
    cookie[SESSION_COOKIE_NAME]["httponly"] = True
    cookie[SESSION_COOKIE_NAME]["secure"] = True
    cookie[SESSION_COOKIE_NAME]["samesite"] = "Strict"
    cookie[SESSION_COOKIE_NAME]["path"] = "/"
    cookie[SESSION_COOKIE_NAME]["max-age"] = max_age
    return cookie.output(header="").strip()


def authenticate(email: str, password: str) -> sqlite3.Row:
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE email=? AND is_active=1", (email.lower(),)).fetchone()
        if not user or not verify_password(password, user["password_hash"]):
            raise AppError(401, "Credenciales inválidas")
        return user


def create_session(user_id: int, active_company_id: Optional[int]) -> str:
    token = secrets.token_urlsafe(32)
    t = now_ts()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions(id, user_id, active_company_id, created_at, expires_at) VALUES(?,?,?,?,?)",
            (token, user_id, active_company_id, t, t + SESSION_TTL_SECONDS),
        )
    return token


def load_session(environ: Dict[str, Any]) -> Optional[sqlite3.Row]:
    token = get_cookie(environ, SESSION_COOKIE_NAME)
    if not token:
        return None
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT s.*, u.email, u.full_name, u.is_superadmin
            FROM sessions s JOIN users u ON u.id=s.user_id
            WHERE s.id=? AND s.expires_at>?
            """,
            (token, now_ts()),
        ).fetchone()
        return row


def destroy_session(environ: Dict[str, Any]) -> None:
    token = get_cookie(environ, SESSION_COOKIE_NAME)
    if token:
        with get_db() as conn:
            conn.execute("DELETE FROM sessions WHERE id=?", (token,))


def get_user_companies(user_id: int):
    with get_db() as conn:
        return conn.execute(
            """
            SELECT uc.id user_company_id, uc.company_id, c.code, c.name, uc.role, uc.is_default
            FROM user_companies uc
            JOIN companies c ON c.id=uc.company_id
            WHERE uc.user_id=?
            ORDER BY c.name
            """,
            (user_id,),
        ).fetchall()


def ensure_membership(user_id: int, company_id: int) -> sqlite3.Row:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM user_companies WHERE user_id=? AND company_id=?",
            (user_id, company_id),
        ).fetchone()
        if not row:
            raise AppError(403, "Usuario sin acceso a la empresa seleccionada")
        return row


def compute_permissions(user_id: int, company_id: int) -> set[str]:
    membership = ensure_membership(user_id, company_id)
    role = membership["role"]
    perms = set(ROLE_BASE_PERMISSIONS.get(role, set()))

    with get_db() as conn:
        perms.update(
            r["permission"]
            for r in conn.execute("SELECT permission FROM role_permissions WHERE role=?", (role,)).fetchall()
        )
        overrides = conn.execute(
            "SELECT permission, allowed FROM user_company_permissions WHERE user_company_id=?",
            (membership["id"],),
        ).fetchall()
    for item in overrides:
        if item["allowed"]:
            perms.add(item["permission"])
        else:
            perms.discard(item["permission"])
    return perms


def require_auth(session: Optional[sqlite3.Row]) -> sqlite3.Row:
    if not session:
        raise AppError(401, "No autenticado")
    return session


def require_company_context(session: sqlite3.Row) -> int:
    company_id = session["active_company_id"]
    if not company_id:
        raise AppError(400, "Debe seleccionar empresa activa")
    return company_id


def require_permission(session: sqlite3.Row, permission: str) -> Tuple[int, set[str]]:
    company_id = require_company_context(session)
    perms = compute_permissions(session["user_id"], company_id)
    if "*" in perms or permission in perms:
        return company_id, perms
    raise AppError(403, f"Permiso requerido: {permission}")


def app(environ: Dict[str, Any], start_response: Callable):
    method = environ["REQUEST_METHOD"].upper()
    path = environ.get("PATH_INFO", "")

    try:
        session = load_session(environ)

        if method == "POST" and path == "/api/auth/login":
            data = parse_json(environ)
            user = authenticate(data.get("email", ""), data.get("password", ""))
            companies = get_user_companies(user["id"])
            default_company = next((c for c in companies if c["is_default"]), None)
            token = create_session(user["id"], default_company["company_id"] if default_company else None)
            return json_response(
                start_response,
                HTTPStatus.OK,
                {
                    "message": "Login exitoso",
                    "user": {"id": user["id"], "email": user["email"], "full_name": user["full_name"]},
                    "active_company_id": default_company["company_id"] if default_company else None,
                },
                cookies=[build_session_cookie(token, SESSION_TTL_SECONDS)],
            )

        if method == "POST" and path == "/api/auth/logout":
            destroy_session(environ)
            return json_response(start_response, HTTPStatus.OK, {"message": "Sesión cerrada"}, cookies=[build_session_cookie("", 0)])

        if method == "GET" and path == "/api/auth/me":
            session = require_auth(session)
            companies = get_user_companies(session["user_id"])
            return json_response(
                start_response,
                HTTPStatus.OK,
                {
                    "user": {
                        "id": session["user_id"],
                        "email": session["email"],
                        "full_name": session["full_name"],
                        "is_superadmin": bool(session["is_superadmin"]),
                    },
                    "active_company_id": session["active_company_id"],
                    "companies": [dict(c) for c in companies],
                },
            )

        if method == "POST" and path == "/api/context/active-company":
            session = require_auth(session)
            data = parse_json(environ)
            company_id = int(data.get("company_id", 0))
            membership = ensure_membership(session["user_id"], company_id)
            role = membership["role"]
            perms = compute_permissions(session["user_id"], company_id)
            if "*" not in perms and "context.switch" not in perms and role != "analyst":
                raise AppError(403, "No puede cambiar de empresa")
            token = get_cookie(environ, SESSION_COOKIE_NAME)
            with get_db() as conn:
                conn.execute("UPDATE sessions SET active_company_id=? WHERE id=?", (company_id, token))
            return json_response(start_response, HTTPStatus.OK, {"message": "Empresa activa actualizada", "active_company_id": company_id})

        if method == "GET" and path == "/api/companies":
            session = require_auth(session)
            companies = get_user_companies(session["user_id"])
            return json_response(start_response, HTTPStatus.OK, {"companies": [dict(c) for c in companies]})

        if method == "GET" and path == "/api/transactions":
            session = require_auth(session)
            company_id, _ = require_permission(session, "transactions.read")
            with get_db() as conn:
                txs = conn.execute(
                    "SELECT id, company_id, description, amount, created_by, created_at FROM transactions WHERE company_id=? ORDER BY id DESC",
                    (company_id,),
                ).fetchall()
            return json_response(start_response, HTTPStatus.OK, {"company_id": company_id, "transactions": [dict(t) for t in txs]})

        if method == "POST" and path == "/api/transactions":
            session = require_auth(session)
            company_id, _ = require_permission(session, "transactions.write")
            data = parse_json(environ)
            with get_db() as conn:
                conn.execute(
                    "INSERT INTO transactions(company_id, description, amount, created_by, created_at) VALUES(?,?,?,?,?)",
                    (company_id, data.get("description", "Sin descripción"), float(data.get("amount", 0)), session["user_id"], now_ts()),
                )
            return json_response(start_response, HTTPStatus.CREATED, {"message": "Transacción creada", "company_id": company_id})

        if method == "GET" and path == "/api/reporting/consolidated":
            session = require_auth(session)
            with get_db() as conn:
                if session["is_superadmin"]:
                    rows = conn.execute(
                        """
                        SELECT c.id company_id, c.name company_name, COALESCE(SUM(t.amount), 0) total
                        FROM companies c LEFT JOIN transactions t ON t.company_id=c.id
                        GROUP BY c.id, c.name
                        ORDER BY c.name
                        """
                    ).fetchall()
                else:
                    companies = get_user_companies(session["user_id"])
                    ids = [str(c["company_id"]) for c in companies]
                    if not ids:
                        rows = []
                    else:
                        qmarks = ",".join(["?"] * len(ids))
                        rows = conn.execute(
                            f"""
                            SELECT c.id company_id, c.name company_name, COALESCE(SUM(t.amount), 0) total
                            FROM companies c LEFT JOIN transactions t ON t.company_id=c.id
                            WHERE c.id IN ({qmarks})
                            GROUP BY c.id, c.name
                            ORDER BY c.name
                            """,
                            ids,
                        ).fetchall()
            return json_response(start_response, HTTPStatus.OK, {"scope": "reporting_only", "totals": [dict(r) for r in rows]})

        return json_response(start_response, HTTPStatus.NOT_FOUND, {"error": "Not found"})

    except AppError as err:
        return json_response(start_response, HTTPStatus(err.status), {"error": err.message})
    except Exception as err:  # defensive fallback
        return json_response(start_response, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": f"Error interno: {err}"})


def cli() -> None:
    import argparse
    from wsgiref.simple_server import make_server

    parser = argparse.ArgumentParser(description="Quercus backend")
    parser.add_argument("command", choices=["init-db", "seed", "run"], help="Command")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    if args.command == "init-db":
        init_db()
        print("DB initialized")
    elif args.command == "seed":
        init_db()
        seed_initial_data()
        print("DB seeded")
    elif args.command == "run":
        init_db()
        seed_initial_data()
        with make_server(args.host, args.port, app) as httpd:
            print(f"Serving on http://{args.host}:{args.port}")
            httpd.serve_forever()


if __name__ == "__main__":
    cli()
