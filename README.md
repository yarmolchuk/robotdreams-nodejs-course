<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## Опис проєкту

E-commerce бекенд на базі NestJS framework з PostgreSQL. Проєкт побудований з використанням модульної архітектури, що забезпечує масштабованість, легкість тестування та підтримки коду.

---

## Архітектура проєкту

### Загальний огляд

Проєкт базується на **модульній архітектурі NestJS** (Modular Monolith) з трирівневою структурою: Controller → Service → Repository (TypeORM).

```
┌──────────────────────────────────────────────────────────────────┐
│                          AppModule                               │
│  ┌──────────────┐  ┌────────────┐  ┌─────────────┐  ┌────────┐  │
│  │ ConfigModule │  │UsersModule │  │ProductsModule│  │Orders  │  │
│  │              │  │            │  │              │  │Module  │  │
│  │ .local.env   │  │ Controller │  │ Controller   │  │Control.│  │
│  │ .dev.env     │  │ Service    │  │ Service      │  │Service │  │
│  │ .prod.env    │  │ Entity     │  │ Entity       │  │Entities│  │
│  └──────────────┘  └────────────┘  └─────────────┘  └────────┘  │
├──────────────────────────────────────────────────────────────────┤
│                    TypeORM + PostgreSQL                           │
└──────────────────────────────────────────────────────────────────┘
```

### Структура проєкту

```
src/
├── main.ts                          # Точка входу, глобальний ValidationPipe
├── app.module.ts                    # Кореневий модуль (TypeORM, Config)
├── app.controller.ts                # Кореневий контролер
├── app.service.ts                   # Кореневий сервіс
├── users/                           # Модуль користувачів
│   ├── entities/user.entity.ts      # User entity
│   ├── dto/create-user.dto.ts       # DTO валідація
│   ├── users.module.ts
│   ├── users.controller.ts
│   └── users.service.ts
├── products/                        # Модуль продуктів
│   ├── entities/product.entity.ts   # Product entity (@VersionColumn)
│   ├── dto/create-product.dto.ts
│   ├── products.module.ts
│   ├── products.controller.ts
│   └── products.service.ts
├── orders/                          # Модуль замовлень
│   ├── entities/
│   │   ├── order.entity.ts          # Order entity (idempotencyKey UNIQUE)
│   │   └── order-item.entity.ts     # OrderItem entity
│   ├── dto/
│   │   ├── create-order.dto.ts
│   │   └── create-order-item.dto.ts
│   ├── enums/order-status.enum.ts
│   ├── orders.module.ts
│   ├── orders.controller.ts
│   └── orders.service.ts            # Транзакційна логіка
└── migrations/                      # TypeORM міграції
    ├── *-InitialSchema.ts
    └── *-SeedData.ts
```

### Entity Relationships

```
User 1 ──── * Order 1 ──── * OrderItem * ──── 1 Product
```

---

## Запуск проєкту

### 1. Встановлення залежностей

```bash
npm install
```

### 2. PostgreSQL

**Через Docker:**
```bash
docker compose up -d
```

**Або локальний PostgreSQL:**
Створити базу `robotdreams`:
```bash
psql -U postgres -c "CREATE DATABASE robotdreams;"
```

### 3. Конфігурація

Створіть файли середовища (вже є в `.gitignore`):

```bash
# .local.env
PORT = 5000
DB_HOST = localhost
DB_PORT = 5432
DB_USERNAME = postgres
DB_PASSWORD = postgres
DB_NAME = robotdreams
```

### 4. Міграції

```bash
npm run migration:run
```

### 5. Запуск

```bash
# Локальне середовище (hot-reload)
npm run start:local

# Development
npm run start:dev

# Production
npm run build && npm run start:prod
```

---

## API Endpoints

### Users

| Метод | Endpoint | Опис | Status |
|-------|----------|------|--------|
| POST | `/users` | Створити користувача | 201, 400 |
| GET | `/users` | Отримати всіх | 200 |
| GET | `/users/:id` | Отримати за ID | 200, 404 |

### Products

| Метод | Endpoint | Опис | Status |
|-------|----------|------|--------|
| POST | `/products` | Створити продукт | 201, 400 |
| GET | `/products` | Отримати всі | 200 |
| GET | `/products/:id` | Отримати за ID | 200, 404 |

### Orders (транзакційне створення)

| Метод | Endpoint | Опис | Status |
|-------|----------|------|--------|
| POST | `/orders` | Створити замовлення (ідемпотентно) | 201, 200, 400, 404, 409 |
| GET | `/orders` | Список замовлень (з фільтрами) | 200 |
| GET | `/orders/:id` | Отримати замовлення з items | 200, 404 |

**Query параметри для `GET /orders`:**
- `status` — PENDING, CONFIRMED, CANCELLED
- `startDate` — ISO дата (від)
- `endDate` — ISO дата (до)

### Приклади запитів

```bash
# Створити замовлення (ідемпотентно)
curl -X POST http://localhost:5000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "idempotencyKey": "unique-key-123",
    "items": [
      { "productId": 1, "quantity": 2 },
      { "productId": 2, "quantity": 1 }
    ]
  }'

# Повторний запит з тим же ключем → 200 OK (той самий order)
curl -X POST http://localhost:5000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "idempotencyKey": "unique-key-123",
    "items": [
      { "productId": 1, "quantity": 2 },
      { "productId": 2, "quantity": 1 }
    ]
  }'

# Отримати замовлення з фільтрами
curl "http://localhost:5000/orders?status=PENDING&startDate=2026-01-01&endDate=2026-12-31"
```

---

## Міграції

```bash
# Згенерувати міграцію з entity changes
npm run migration:generate -- src/migrations/MigrationName

# Запустити міграції
npm run migration:run

# Відкотити останню міграцію
npm run migration:revert
```

---

## Технології

- **Runtime:** Node.js
- **Framework:** NestJS 11
- **Language:** TypeScript 5
- **Database:** PostgreSQL 16
- **ORM:** TypeORM 0.3
- **Configuration:** @nestjs/config
- **Validation:** class-validator, class-transformer
- **Container:** Docker Compose
- **Package Manager:** npm
