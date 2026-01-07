# کیوسک فروش - نانوایی ستاره سرخ

پروژه فرانت‌اند کیوسک فروش با Next.js 14، TypeScript و Tailwind CSS

## ویژگی‌ها

- ✅ Next.js 14 با App Router
- ✅ TypeScript
- ✅ Tailwind CSS با Dark Mode
- ✅ Zustand برای State Management
- ✅ React Query برای Data Fetching
- ✅ React Hook Form + Zod برای Validation
- ✅ Axios برای API Calls
- ✅ Framer Motion برای Animations
- ✅ فونت Vazir
- ✅ ریسپانسیو و بهینه

## نصب و راه‌اندازی

```bash
# نصب dependencies
npm install

# کپی فایل env
cp .env.local.example .env.local

# تنظیم API Base URL در .env.local
NEXT_PUBLIC_API_BASE_URL=http://your-api-url

# اجرای development server
npm run dev
```

## ساختار پروژه

```
kiosk_frontend/
├── app/
│   ├── (customer)/          # صفحات کاربر
│   ├── (admin)/             # صفحات ادمین
│   └── layout.tsx
├── components/
│   ├── customer/            # کامپوننت‌های کاربر
│   ├── admin/               # کامپوننت‌های ادمین
│   └── shared/              # کامپوننت‌های مشترک
├── lib/
│   ├── api/                 # API calls
│   ├── store/               # Zustand stores
│   └── utils/               # Utilities
└── types/                   # TypeScript types
```

## صفحات

- `/` - صفحه اصلی (redirect به `/customer`)
- `/customer` - صفحه اصلی کاربر (محصولات + سبد خرید)
- `/admin/login` - صفحه لاگین ادمین
- `/admin/reports` - صفحه گزارشات ادمین

## تکنولوژی‌ها

- **Next.js 14** - React Framework
- **TypeScript** - Type Safety
- **Tailwind CSS** - Styling
- **Zustand** - State Management
- **React Query** - Server State
- **React Hook Form** - Form Management
- **Zod** - Schema Validation
- **Axios** - HTTP Client
- **Framer Motion** - Animations
- **date-fns-jalali** - تاریخ شمسی

## توسعه

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start

# Lint
npm run lint
```

