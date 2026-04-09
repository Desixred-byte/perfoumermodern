# Perfoumer (Next.js)

Premium və elegant ətir vitrin saytı. Dizayn istiqaməti Framer versiyasına bənzərdir: açıq fon, böyük hero, seçilmiş məhsullar və detal səhifəsində not strukturu.

## Tech Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS
- CSV data source (`data/`)

## Run

```bash
npm install
npm run dev
```

## Data Structure (CSV)

### 1) Perfumes CSV

Path: `data/perfumes.csv`

Required columns:

- `id`
- `slug`
- `name`
- `brand`
- `gender`
- `short_description`
- `long_description`
- `hero_image`
- `card_image`
- `price_15`
- `price_30`
- `price_50`
- `top_note_ids` (pipe-separated, example: `apple|cardamom`)
- `heart_note_ids` (pipe-separated)
- `base_note_ids` (pipe-separated)
- `best_seller` (`true`/`false`)

### 2) Notes CSV

Path: `data/notes.csv`

Required columns:

- `id`
- `name`
- `category` (`top` | `heart` | `base`)
- `image`
- `description`

## How join works

- Hər ətirdə `top_note_ids`, `heart_note_ids`, `base_note_ids` var.
- Hər ID `notes.csv` içindəki `id` ilə uyğunlaşdırılır.
- Bu join `src/lib/catalog.ts` daxilində edilir və detail page üçün `notes.top`, `notes.heart`, `notes.base` şəklində qaytarılır.

## Current pages

- `/` → Hero + best seller məhsullar
- `/perfumes/[slug]` → məhsul detalı + ölçü qiymətləri + not kartları

## Supabase migration (next step)

CSV ilə eyni schema saxlanılsa, keçid sadə olacaq:

- `perfumes` cədvəli → `perfumes.csv` sütunları
- `notes` cədvəli → `notes.csv` sütunları
- gələcəkdə `perfume_notes` pivot table əlavə edilə bilər (daha relational model üçün)

Bu quruluş intentionally modular saxlanıb ki, `src/lib/catalog.ts` içində CSV read hissəsi sonradan Supabase query ilə əvəzlənsin.
