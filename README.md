# Minimal Market

Минималистичный маркетплейс для покупки и продажи вещей. Учебный проект OTUS.

**Демо:** https://ВАША-ССЫЛКА.vercel.app

## Возможности

- каталог товаров с поиском по названию и категории;
- страница товара с описанием и ценой;
- избранное и корзина со счётчиками (сохраняются в `localStorage`);
- регистрация и вход по email и паролю (Supabase Auth);
- публикация товаров с загрузкой фотографии (Supabase Storage);
- личный кабинет со списком своих товаров и удалением;
- защита данных на уровне базы: удалять и менять товар может только его владелец.

## Технологии

- React, TypeScript, Vite
- React Router DOM
- Lucide React
- CSS
- Supabase: PostgreSQL, Auth, Storage

## Запуск локально

1. Установите [Node.js](https://nodejs.org) (LTS-версия).
2. Склонируйте репозиторий и установите зависимости:

```bash
   git clone https://github.com/ВАШ-ЛОГИН/minimal-market.git
   cd minimal-market
   npm install
```

3. Создайте проект на [supabase.com](https://supabase.com) и выполните SQL из файла
   `supabase/schema.sql` (раздел **SQL Editor**).
4. В Supabase откройте **Authentication → Sign In / Providers → Email** и на время
   разработки отключите **Confirm email**.
5. Скопируйте `.env.example` в `.env.local` и вставьте свои значения из
   **Project Settings → API**:

```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_public_anon_key
```

6. Запустите проект:

```bash
   npm run dev
```

   Сайт откроется на `http://localhost:5173`.

## Скрипты

| Команда | Что делает |
|---|---|
| `npm run dev` | запуск в режиме разработки |
| `npm run build` | сборка для публикации |
| `npm run preview` | предпросмотр собранной версии |

## Структура проекта

```text
src/
├── app/            маршруты
├── component/      компоненты (шапка, макет, карточка товара, защита страниц)
├── context/        состояние: авторизация, избранное, корзина, товары
├── lib/            клиент Supabase и работа с хранилищем
├── pages/          страницы
├── data/           типы данных
└── App.css, index.css
supabase/schema.sql  схема базы данных
```

## Деплой

Проект публикуется на Vercel. В настройках проекта заданы переменные окружения
`VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`. Файл `vercel.json` настраивает
перенаправление всех адресов на `index.html` для работы React Router.

## Планы

- редактирование товара;
- оформление заказов;
- подтверждение почты при регистрации.