import io
import json
import os
import tempfile
import unittest

import app as quercus


class SecurityFlowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        quercus.DB_PATH = os.path.join(self.tmp.name, "test.db")
        quercus.init_db()
        quercus.seed_initial_data()

    def tearDown(self):
        self.tmp.cleanup()

    def call(self, method, path, body=None, cookie=None):
        payload = json.dumps(body or {}).encode()
        environ = {
            "REQUEST_METHOD": method,
            "PATH_INFO": path,
            "CONTENT_LENGTH": str(len(payload) if body is not None else 0),
            "wsgi.input": io.BytesIO(payload if body is not None else b""),
            "HTTP_COOKIE": cookie or "",
        }
        status_holder = {}
        headers_holder = {}

        def start_response(status, headers):
            status_holder["status"] = status
            headers_holder["headers"] = headers

        raw = b"".join(quercus.app(environ, start_response)).decode()
        response = json.loads(raw)
        return status_holder["status"], dict(headers_holder["headers"]), response

    def test_login_and_tenant_isolation(self):
        status, headers, _ = self.call("POST", "/api/auth/login", {"email": "multiempresa@quercus.local", "password": "Manager123!"})
        self.assertTrue(status.startswith("200"))
        cookie = headers["Set-Cookie"].split(";", 1)[0]

        status, _, _ = self.call("POST", "/api/transactions", {"description": "Venta", "amount": 10}, cookie)
        self.assertTrue(status.startswith("201"))

        status, _, body = self.call("POST", "/api/context/active-company", {"company_id": 2}, cookie)
        self.assertTrue(status.startswith("200"))
        self.assertEqual(body["active_company_id"], 2)

        status, _, body = self.call("POST", "/api/transactions", {"description": "No permitido", "amount": 5}, cookie)
        self.assertTrue(status.startswith("403"))
        self.assertIn("Permiso requerido", body["error"])

        status, _, body = self.call("GET", "/api/transactions", cookie=cookie)
        self.assertTrue(status.startswith("200"))
        self.assertEqual(body["company_id"], 2)
        self.assertEqual(len(body["transactions"]), 0)


if __name__ == "__main__":
    unittest.main()
