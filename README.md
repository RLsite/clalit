# מערכת ניהול חלקי תחזוקה מונעת — כללית הנדסה רפואית

העתק מלא ועצמאי של האפליקציה שנבנתה ב-base44 (clalit-part-pulse), ללא שום תלות ב-base44.
רץ על Cloudflare Pages + Functions + D1, עם בקרת כניסה דרך Cloudflare Access.

## מה יש באתר

- **דף ראשי** — רשימת כל מכשירי המעבדה עם חיפוש, תמונות, קטגוריות ומונה חלקים
- **דף מכשיר** — חלקי החילוף של כל מכשיר, מקובצים לפי סוג טיפול (חצי שנתי / שנתי / כללי / משאבות / ISE)
- **טבלאות INFO** — טבלת מידע לכל מכשיר: PCR, Rotor-Gene, Hamilton, Bilimeter + טבלה גנרית לכל השאר, כולל הוספה/עריכה/מחיקה של שורות, העלאת תמונות וייצוא לאקסל
- **מדריכים (PM)** — דפי הדרכה היררכיים עם טקסט ותמונות, כולל עורך מובנה
- **ניהול הרשאות** — מנהלי מערכת + הרשאות עריכה פר-דף לפי כתובת המייל שאיתה המשתמש נכנס

## מבנה הפרויקט

```
index.html, css/, js/, images/    האתר עצמו (HTML/CSS/JS — ללא build), בתיקיית הרוט
functions/api/        ה-API (Cloudflare Pages Functions מעל D1)
  [[path]].js         כל נקודות הקצה
  seed-data.js        כל הנתונים שהועתקו מהאתר המקורי (נטען אוטומטית בפעם הראשונה)
scripts/make-seed.js  ממיר את scrape/*.json ל-seed-data.js
scrape/               הנתונים הגולמיים שנשאבו מ-base44 (גיבוי)
```

בסיס הנתונים נוצר ומאוכלס **אוטומטית** בבקשת ה-API הראשונה — אין צורך להריץ SQL ידנית.

---

# 🚀 הקמה ב-Cloudflare — שלב אחרי שלב

## שלב 1: חשבון Cloudflare

1. היכנס ל-https://dash.cloudflare.com (או פתח חשבון חינמי — התוכנית החינמית מספיקה לכל מה שכאן).

## שלב 2: יצירת בסיס הנתונים (D1)

1. בתפריט הצד: **Storage & Databases → D1 SQL Database**
2. לחץ **Create Database**
3. שם: `clalit-parts` → **Create**

זהו. אין צורך להריץ סכמה — הטבלאות והנתונים נוצרים לבד בכניסה הראשונה לאתר.

## שלב 3: חיבור הריפו ל-Cloudflare Pages

1. בתפריט הצד: **Compute (Workers & Pages) → Create → Pages → Connect to Git**
2. התחבר לחשבון GitHub שלך ובחר את הריפו **RLsite/clalit**
3. בהגדרות ה-Build:
   - **Framework preset**: None
   - **Build command**: (להשאיר ריק)
   - **Build output directory**: `/` (שורש הריפו — להשאיר ריק או לרשום `/`)
4. לחץ **Save and Deploy**

## שלב 4: חיבור בסיס הנתונים לאתר

1. אחרי שה-Deploy הראשון מסתיים: **הפרויקט → Settings → Bindings → Add**
2. בחר **D1 Database**
3. **Variable name**: `DB` (בדיוק ככה, באותיות גדולות)
4. **D1 database**: בחר `clalit-parts`
5. שמור, ואז **Deployments → ⋯ → Retry deployment** (כדי שה-binding ייכנס לתוקף)

האתר עכשיו חי בכתובת `https://clalit-part-pulse.pages.dev` (או השם שבחרת).
היכנס אליו פעם אחת — הנתונים ייטענו אוטומטית מהגיבוי.

## שלב 5: בקרת כניסה — רק משתמשים מורשים (Cloudflare Access)

1. בתפריט הצד: **Zero Trust** (בפעם הראשונה יבקש לבחור שם צוות — כל שם שתרצה, זה חינם עד 50 משתמשים)
2. **Access → Applications → Add an application → Self-hosted**
3. **Application name**: Clalit Parts
4. תחת **Public hostname** לחץ Add:
   - **Subdomain**: שם הפרויקט שלך (למשל `clalit-part-pulse`)
   - **Domain**: `pages.dev`
   - וגם שורה שנייה עם subdomain `*.clalit-part-pulse` (מכסה גם את כתובות ה-Preview)
5. המשך ל-**Policies → Add a policy**:
   - **Policy name**: משתמשים מורשים
   - **Action**: Allow
   - תחת **Include** בחר **Emails** והכנס את רשימת המיילים המורשים
     (אפשר גם **Emails ending in** לדומיין שלם, למשל `@clalit.org.il`)
6. **Login methods**: השאר את **One-time PIN** מסומן — משתמש מקבל קוד חד-פעמי למייל, בלי סיסמאות
7. שמור.

מעכשיו כל מי שנכנס לאתר יתבקש להזדהות במייל, ורק מיילים מהרשימה ייכנסו.

> חשוב: מומלץ גם **Workers & Pages → הפרויקט → Settings → General → Access policy → Enabled**
> כדי שגם כתובות ה-Preview של כל deployment יהיו מוגנות.

## שלב 6: הרשאות עריכה בתוך האתר

- שני מנהלי מערכת מוגדרים מראש: `clalit.rl@gmail.com` ו-`levy.harel@gmail.com`
- מנהל רואה כפתור **"ניהול משתמשים"** בכל טבלה — שם מוסיפים:
  - **מנהלי מערכת** נוספים (גישה מלאה לכל האתר)
  - **הרשאת עריכה לדף ספציפי** לפי מייל
- מי שנכנס דרך Access אך אינו ברשימות — רואה הכול אך לא יכול לערוך.

---

## פיתוח מקומי

```bash
npx wrangler pages dev .
```

נפתח על http://localhost:8788 עם D1 מקומי (נוצר ומאוכלס אוטומטית).
בסביבה מקומית אין Cloudflare Access ולכן אתה נחשב מנהל מערכת אוטומטית.

## עדכון נתוני הבסיס (seed)

אם רוצים לרענן את נתוני הפתיחה מקבצי ה-scrape:

```bash
node scripts/make-seed.js
```

הנתונים נטענים רק אם בסיס הנתונים ריק — נתונים קיימים לא נדרסים.
