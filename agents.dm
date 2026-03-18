# AGENTS.md — Quercus ERP

## 🎯 Propósito del repositorio
Quercus es un sistema ERP SaaS multiempresa (multi-tenant), orientado a gestión administrativa, financiera y operativa, con proyección a integración contable bajo normativa argentina.

Este repositorio debe mantenerse consistente, escalable y sin mezcla de tecnologías.

---

## 🧱 Stack oficial (OBLIGATORIO)

Toda implementación debe utilizar exclusivamente:

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Node.js
- PostgreSQL
- Prisma ORM

---

## 🚫 Tecnologías y patrones PROHIBIDOS

No introducir bajo ninguna circunstancia:

- Python
- Flask, FastAPI, Django
- `requirements.txt`
- `app.py`
- carpetas `templates/` o `static/`
- HTML tradicional fuera de Next.js
- servidores backend paralelos
- APIs externas innecesarias si pueden resolverse internamente
- duplicación de arquitectura (ej: otro backend separado)
- jQuery o librerías legacy de frontend

Si una solución parece requerir alguno de estos elementos, debe adaptarse al stack oficial.

---

## 🧠 Principios arquitectónicos

### 1. Un solo stack
No mezclar tecnologías ni generar soluciones paralelas.

### 2. Integración sobre duplicación
Antes de crear archivos nuevos, verificar si existe una forma de integrarlo en la estructura actual.

### 3. Multiempresa desde el diseño
Todas las entidades persistentes deben contemplar:

```ts
empresaId