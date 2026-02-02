<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>

## Опис проєкту

Серверний додаток на базі NestJS framework. Проєкт побудований з використанням модульної архітектури, що забезпечує масштабованість, легкість тестування та підтримки коду.

---

## Архітектура проєкту

### Загальний огляд

Проєкт базується на **модульній архітектурі NestJS**, яка є реалізацією патерну **Modular Monolith**. Цей підхід поєднує простоту моноліту з організаційними перевагами мікросервісів.

```
┌─────────────────────────────────────────────────────────┐
│                      Application                        │
├─────────────────────────────────────────────────────────┤
│                       AppModule                         │
│  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │  ConfigModule   │  │        UsersModule          │   │
│  │  (глобальний)   │  │  ┌──────────┐ ┌───────────┐ │   │
│  │                 │  │  │Controller│ │  Service  │ │   │
│  │  .local.env     │  │  └──────────┘ └───────────┘ │   │
│  │  .dev.env       │  │                             │   │
│  │  .prod.env      │  │                             │   │
│  └─────────────────┘  └─────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│                    NestJS Core                          │
├─────────────────────────────────────────────────────────┤
│                   Express / Node.js                     │
└─────────────────────────────────────────────────────────┘
```

### Структура проєкту

```
src/
├── main.ts                 # Точка входу, глобальний ValidationPipe
├── app.module.ts           # Кореневий модуль
├── app.controller.ts       # Кореневий контролер
├── app.service.ts          # Кореневий сервіс
└── users/                  # Feature-модуль користувачів
    ├── users.module.ts     # Модуль користувачів
    ├── users.controller.ts # Контролер (HTTP endpoints)
    ├── users.service.ts    # Бізнес-логіка
    ├── dto/                # Data Transfer Objects
    │   └── create-user.dto.ts
    └── interfaces/         # TypeScript інтерфейси
        └── user.interface.ts
```

---

## Архітектурні рішення

### 1. Модульна структура

**Чому саме так:**

- **Інкапсуляція** — кожен модуль містить власні контролери, сервіси та залежності
- **Незалежність** — модулі можна розробляти, тестувати та деплоїти незалежно
- **Масштабованість** — легко додавати нові feature-модулі без впливу на існуючі
- **Перевикористання** — модулі можна експортувати та імпортувати в інші частини додатку

```typescript
// Приклад підключення модуля
@Module({
  imports: [ConfigModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### 2. Шаруватість (Layered Architecture)

Кожен модуль дотримується трирівневої архітектури:

| Шар.           | Відповідальність                               | Файл              |
|----------------|------------------------------------------------|-------------------|
| **Controller** | HTTP запити/відповіді, валідація вхідних даних | `*.controller.ts` |
| **Service**    | Бізнес-логіка, обробка даних                   | `*.service.ts`    |
| **Module**     | Конфігурація залежностей, DI контейнер         | `*.module.ts`     |

**Чому саме так:**

- **Separation of Concerns** — чіткий розподіл відповідальності
- **Тестованість** — легко мокати залежності на кожному рівні
- **Підтримуваність** — зміни в одному шарі не впливають на інші

### 3. Dependency Injection (DI)

NestJS використовує вбудований IoC-контейнер для управління залежностями:

```typescript
@Controller('users')
export class UsersController {
  // Сервіс інжектується автоматично
  constructor(private readonly usersService: UsersService) {}
}
```

**Чому саме так:**

- **Loose Coupling** — класи не створюють залежності самостійно
- **Тестованість** — легко підміняти реальні сервіси на моки
- **Гнучкість** — можна змінювати реалізації без зміни споживачів

### 4. Конфігурація середовища

Проєкт підтримує три середовища з окремими конфігураціями:

| Середовище  | Файл         | Порт | Команда               |
|-------------|--------------|------|-----------------------|
| Local       | `.local.env` | 5000 | `npm run start:local` |
| Development | `.dev.env`   | 3000 | `npm run start:dev`   |
| Production  | `.prod.env`  | 2026 | `npm run start:prod`  |

**Чому саме так:**

- **Безпека** — конфігурації не потрапляють в git (`.gitignore`)
- **Гнучкість** — різні налаштування для різних середовищ
- **12-Factor App** — дотримання принципу "Store config in environment"

```typescript
// Динамічне завантаження конфігурації
ConfigModule.forRoot({
  envFilePath: `.${process.env.NODE_ENV}.env`,
})
```

---

## Потік даних

```
HTTP Request
     │
     ▼
┌─────────────┐
│  Controller │ ← Приймає запит, валідує дані
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service   │ ← Виконує бізнес-логіку
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Repository │ ← Робота з БД (буде додано)
└──────┬──────┘
       │
       ▼
HTTP Response
```

---

## API Endpoints

### Users

| Метод | Endpoint | Опис |
|-------|----------|------|
| POST | `/users` | Створити користувача |
| GET | `/users` | Отримати всіх користувачів |
| GET | `/users/:id` | Отримати користувача за ID |

### Приклади запитів

```bash
# Створити користувача
curl -X POST http://localhost:5000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'

# Отримати всіх користувачів
curl http://localhost:5000/users

# Отримати користувача за ID
curl http://localhost:5000/users/1
```

---

## Валідація

Проєкт використовує `class-validator` для валідації вхідних даних.

### ValidationPipe (глобальний)

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,           // Видаляє невідомі поля
  forbidNonWhitelisted: true, // Помилка при невідомих полях
  transform: true,           // Автоматична трансформація типів
}));
```

### CreateUserDto

```typescript
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
```

При невалідних даних повертається HTTP 400 з детальним описом помилок.

---

## Запуск проєкту

### Встановлення залежностей

```bash
npm install
```

### Створення env файлів

```bash
# .local.env
PORT=5000

# .dev.env
PORT=3000

# .prod.env
PORT=2026
```

### Запуск

```bash
# Локальне середовище (з hot-reload)
npm run start:local

# Development середовище (з hot-reload)
npm run start:dev

# Production
npm run build
npm run start:prod
```

---

## Технології

- **Runtime:** Node.js
- **Framework:** NestJS 11
- **Language:** TypeScript 5
- **Configuration:** @nestjs/config
- **Validation:** class-validator, class-transformer
- **Package Manager:** npm
