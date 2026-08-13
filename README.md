# מערכת ניהול חלקי תחזוקה מונעת — כללית הנדסה רפואית

העתק מלא ועצמאי של האפליקציה שנבנתה ב-base44 (clalit-part-pulse), ללא שום תלות ב-base44.
רץ כ-**Cloudflare Worker** אחד (סטטי + API מעל D1), עם בקרת כניסה דרך Cloudflare Access.

## מה יש באתר

- **דף ראשי** — רשימת כל מכשירי המעבדה עם חיפוש, תמונות, קטגוריות ומונה חלקים
- **דף מכשיר** — חלקי החילוף של כל מכשיר, מקובצים לפי סוג טיפול (חצי שנתי / שנתי / כללי / משאבות / ISE)
- **טבלאות INFO** — טבלת מידע לכל מכשיר: PCR, Rotor-Gene, Hamilton, Bilimeter + טבלה גנרית לכל השאר, כולל הוספה/עריכה/מחיקה של שורות, העלאת תמונות וייצוא לאקסל
- **מדריכים (PM)** — דפי הדרכה היררכיים עם טקסט ותמונות, כולל עורך מובנה
- **ניהול הרשאות** — מנהלי מערכת + הרשאות עריכה פר-דף לפי כתובת המייל שאיתה המשתמש נכנס

## מבנה הפרויקט וארכיטקטורה

```
index.html, css/, js/, images/   האתר עצמו (HTML/CSS/JS — ללא build), בתיקיית הרוט
src/worker.js          נקודת הכניסה של ה-Worker: מגיש /api/* ומפנה כל השאר לקבצים הסטטיים
src/seed-data.js        כל הנתונים שהועתקו מהאתר המקורי (נטען אוטומטית בפעם הראשונה)
wrangler.jsonc          תצורת הפריסה — כולל את חיבור ה-D1 (binding בשם DB)
scripts/make-seed.js    ממיר את scrape/*.json ל-src/seed-data.js
scrape/                 הנתונים הגולמיים שנשאבו מ-base44 (גיבוי)
```

**חשוב להבין:** הפרויקט הזה מחובר ב-Cloudflare כפרויקט **Workers** (נפרס עם `npx wrangler deploy` ישירות מ-GitHub, לא "Cloudflare Pages" הקלאסי). המשמעות: כל ה-routing — גם הגשת האתר הסטטי וגם ה-API — קורה בקובץ Worker אחד (`src/worker.js`), וכל ההגדרות (כולל חיבור ה-D1) מוגדרות בקובץ `wrangler.jsonc` שנמצא בריפו. **אין צורך להגדיר D1 binding ידנית בדשבורד** — זה קורה אוטומטית בכל פריסה, ישירות מהקובץ.

בסיס הנתונים נוצר ומאוכלס **אוטומטית** בבקשת ה-API הראשונה — אין צורך להריץ SQL ידנית.

---

# 🚀 הקמה ב-Cloudflare

## שלב 1: יצירת בסיס הנתונים (D1) — אם עוד לא קיים

1. בדשבורד של Cloudflare: **Storage & Databases → D1 SQL Database → Create Database**
2. שם: `clalit-parts` → **Create**
3. פתח את הבסיס נתונים שנוצר → לשונית **Overview** → העתק את ה-**Database ID** (UUID)
4. ודא שב-`wrangler.jsonc` (בריפו) בשדה `database_id` מופיע בדיוק אותו UUID

## שלב 2: חיבור הריפו כפרויקט Workers

1. בדשבורד: **Compute (Workers & Pages) → Create → Connect to Git** (או "Import a repository")
2. בחר את **RLsite/clalit**
3. Cloudflare יזהה את `wrangler.jsonc` בריפו ויציע את פקודות ה-build/deploy המתאימות (`npx wrangler deploy`) — אין צורך לשנות כלום
4. **Save and Deploy**

מהרגע הזה, **כל push לענף `main`** יפעיל אוטומטית build+deploy חדש (Workers Builds), וה-D1 binding יתחבר לבד מהקובץ — בלי מסכי Bindings ידניים.

## שלב 3: דומיין מותאם (אם רוצים)

בפרויקט: **Settings → Domains & Routes → Add** — אפשר להוסיף דומיין מותאם אישית (למשל `clalit.rlapp.net`) בנוסף לכתובת ה-`*.workers.dev` הדיפולטיבית.

## שלב 4: בקרת כניסה — רק משתמשים מורשים (Cloudflare Access)

1. בתפריט הצד: **Zero Trust** (בפעם הראשונה יבקש לבחור שם צוות — כל שם שתרצה, זה חינם עד 50 משתמשים)
2. **Access → Applications → Add an application → Self-hosted**
3. **Application name**: Clalit Parts
4. תחת **Public hostname** הוסף את הדומיין/כתובת ה-Worker שלך (למשל `clalit.rlapp.net`, וגם `*.workers.dev` הרלוונטי אם משתמשים בו)
5. **Policies → Add a policy**:
   - **Policy name**: משתמשים מורשים
   - **Action**: Allow
   - תחת **Include** בחר **Emails** והכנס את רשימת המיילים המורשים
     (אפשר גם **Emails ending in** לדומיין שלם, למשל `@clalit.org.il`)
6. **Login methods**: השאר את **One-time PIN** מסומן — משתמש מקבל קוד חד-פעמי למייל, בלי סיסמאות
7. שמור.

מעכשיו כל מי שנכנס לאתר יתבקש להזדהות במייל, ורק מיילים מהרשימה ייכנסו.

## שלב 5: הרשאות עריכה בתוך האתר

- שני מנהלי מערכת מוגדרים מראש: `clalit.rl@gmail.com` ו-`levy.harel@gmail.com`
- מנהל רואה כפתור **"ניהול משתמשים"** בכל טבלה — שם מוסיפים:
  - **מנהלי מערכת** נוספים (גישה מלאה לכל האתר)
  - **הרשאת עריכה לדף ספציפי** לפי מייל
- מי שנכנס דרך Access אך אינו ברשימות — רואה הכול אך לא יכול לערוך.

---

## פיתוח מקומי

```bash
npx wrangler dev
```

נפתח על http://localhost:8787 עם D1 מקומי (נוצר ומאוכלס אוטומטית).
בסביבה מקומית אין Cloudflare Access ולכן אתה נחשב מנהל מערכת אוטומטית.

## עדכון נתוני הבסיס (seed)

אם רוצים לרענן את נתוני הפתיחה מקבצי ה-scrape:

```bash
node scripts/make-seed.js
```

הנתונים נטענים רק אם בסיס הנתונים ריק (מסומן ב-`meta.seeded`) — נתונים קיימים לא נדרסים.

## Hamilton PM — consolidated manual

The Hamilton MICROLAB® STAR PM manual is maintained as a safe additive overlay:

```bash
node scripts/import-hamilton-pm.js
```

This generates `src/hamilton-pm.js` from the consolidated source in the script. The
original `scrape/GuidePage.json`, `scrape/GuideBlock.json`, and generated
`src/seed-data.js` remain unchanged. On the next API initialization, the Worker
applies the overlay once using `meta.hamilton_pm_version`: the Hamilton PM root
keeps its `PM` button and exposes one page per system below it.
