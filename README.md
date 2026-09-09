# Equipment Borrowing and Return Monitoring System

A clean, responsive, and robust web application designed for college laboratories and academic departments to streamline equipment checkout, track custodianship, monitor active borrowings, calculate overdue items, and maintain inventory integrity.

Built for **Systems Analysis and Design (SAD)** / College Laboratory coursework.

---

## 1. Project Description
The **Equipment Borrowing and Return Monitoring System** is an online database-driven management portal created for College Laboratory Custodians and System Administrators. It replaces paper logbooks and manual spreadsheets with an automated, real-time web portal that tracks laboratory equipment lifecycle, borrowing transactions, student/faculty borrowers, due dates, and returns.

---

## 2. Problem Statement
Educational institutions often face operational bottlenecks due to manual record-keeping of laboratory equipment:
- Difficulty determining which items are currently in use vs. available in storage.
- Lack of accountability regarding who borrowed an item, for what purpose, and when it is due.
- Unnoticed overdue equipment resulting in misplaced or unreturned laboratory assets.
- Inefficient search and retrieval when auditing equipment history.

---

## 3. Objectives
1. **Automate Inventory Tracking:** Maintain a centralized PostgreSQL database of laboratory equipment with condition and availability indicators.
2. **Streamline Borrowing & Returns:** Provide one-click borrowing and return workflows that prevent duplicate borrowing of unavailable items.
3. **Automate Overdue Alerts:** Dynamically detect and highlight transactions that have exceeded their designated due date.
4. **Enforce Data Security & Validation:** Protect all data modifications behind Supabase Authentication and PostgreSQL Row Level Security (RLS) policies.
5. **Zero-Backend Static Deployment:** Deliver a responsive static web application deployable directly on **GitHub Pages**.

---

## 4. Key Features
- 🔐 **Supabase Authentication:** Secure email/password login, active session checking, and route protection.
- 📊 **Dynamic Dashboard:** Live counters for Total Equipment, Available, Borrowed, Returned, and Overdue items.
- 📦 **Equipment CRUD:** Add, view, edit, and safely delete equipment items with duplicate asset code prevention.
- 📋 **Borrowing Management:** Record borrower information (Student, Faculty, Staff), department, borrowing date, and due date.
- ↩️ **Return Processing:** Complete returns with automatic date stamping and instant restoration of equipment availability.
- ⚠️ **Smart Overdue Detection:** Automatic highlighting of late transactions with animated badges and dashboard banner alerts.
- 🔍 **Instant Search:** Real-time search across equipment name, asset code, borrower name, and department without page reloads.
- 🗂️ **Multi-Criteria Filtering:** Filter equipment by availability (`All`, `Available`, `Borrowed`) and transactions by status (`All`, `Borrowed`, `Returned`, `Overdue`).
- 📱 **Responsive Design:** Mobile and tablet optimized layout with slide-out navigation and touch-friendly controls.

---

## 5. Technologies Used
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+ async/await, DOM APIs)
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth (Email & Password)
- **API Client:** Official `@supabase/supabase-js` v2 (via CDN)
- **Deployment:** GitHub Pages (Static Web Hosting)
- **Version Control:** Git / GitHub

---

## 6. System Actors
- **Main Actor (Primary):** **System User / Equipment Custodian** — Interacts directly with the application to log in, manage inventory, execute borrowing/return actions, and review reports.
- **Secondary Actor:** **Borrower (Student / Faculty / Staff)** — Indirect beneficiary whose details and borrowings are tracked in the system.

---

## 7. Database Structure

The system uses two relational tables in Supabase PostgreSQL:

```
┌─────────────────────────┐           ┌────────────────────────────────┐
│        EQUIPMENT        │ 1       * │      BORROW_TRANSACTIONS       │
├─────────────────────────┤───────────├────────────────────────────────┤
│ id (PK)                 │           │ id (PK)                        │
│ equipment_name          │           │ equipment_id (FK)              │
│ category                │           │ borrower_name                  │
│ asset_code (UNIQUE)     │           │ borrower_type                  │
│ condition               │           │ department                     │
│ availability            │           │ date_borrowed                  │
│ created_at              │           │ due_date                       │
└─────────────────────────┘           │ date_returned                  │
                                      │ status                         │
                                      │ user_id (FK -> auth.users)     │
                                      │ created_at                     │
                                      └────────────────────────────────┘
```

See [documentation/erd.md](documentation/erd.md) for full schema data dictionaries and [database/schema.sql](database/schema.sql) for the SQL creation script.

---

## 8. Installation & Setup Guide

### Step 1: Clone Repository
```bash
git clone https://github.com/USERNAME/SAD-EquipmentBorrowing-Lastname.git
cd SAD-EquipmentBorrowing-Lastname
```

### Step 2: Configure Supabase Database
1. Log into your [Supabase Dashboard](https://supabase.com).
2. Create a new project (e.g., `equipment-monitoring-lab`).
3. Navigate to **SQL Editor** in the Supabase sidebar.
4. Open the file [`database/schema.sql`](database/schema.sql), paste its contents into the SQL Editor, and click **Run**.
5. Create a user account in Supabase Dashboard under **Authentication > Users** (e.g. `custodian@college.edu`).

### Step 3: Configure Frontend Credentials
Open `js/supabase.js` and insert your Supabase Project URL and Public Anon Key:
```javascript
const DEFAULT_SUPABASE_URL = 'https://your-project-id.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...';
```
*(Alternatively, you can click "⚙️ Configure Supabase API" directly on `login.html` in your web browser to enter credentials without modifying files).*

### Step 4: Run the Application
Because this is a pure static web application, you can simply open `login.html` or `index.html` in any modern web browser or serve it using any local static server (e.g. VS Code Live Server).

---

## 9. Supabase Row Level Security (RLS)
Both tables have RLS enabled with strict policies:
- Authenticated users (`custodians`) have full `SELECT`, `INSERT`, `UPDATE`, and `DELETE` access.
- Unauthenticated public requests cannot access or alter data.
- Only the **public `anon` key** is used on the frontend. The secret `service_role` key is never exposed.

---

## 10. Core Business Rules Implemented
- **BR-01:** Equipment name cannot be empty.
- **BR-02:** Asset code must be unique across all equipment records.
- **BR-03:** Only currently available equipment (`availability = 'Available'`) can be selected for borrowing.
- **BR-04:** Borrower name and details are required.
- **BR-05:** Due date cannot be earlier than borrowing date.
- **BR-06:** Newly created transactions receive `status = 'Borrowed'`.
- **BR-07:** Borrowed equipment automatically transitions to `availability = 'Borrowed'`.
- **BR-08:** Returning an item records `date_returned`, updates status to `Returned`, and restores equipment availability to `Available`.
- **BR-09:** Any unreturned borrowing where `current_date > due_date` is dynamically classified as `⚠️ OVERDUE`.
- **BR-10:** Equipment deletion requires explicit user confirmation and checks for active borrowing dependencies.
- **BR-11:** Dashboard and CRUD features are protected behind authentication.
- **BR-12:** A returned transaction cannot be returned a second time.

---

## 11. GitHub Pages Deployment

To host this project publicly on GitHub Pages:
1. Push the repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial equipment borrowing system release"
   git branch -M main
   git remote add origin https://github.com/USERNAME/SAD-EquipmentBorrowing-Lastname.git
   git push -u origin main
   ```
2. On GitHub, go to your repository **Settings > Pages**.
3. Under **Build and deployment > Branch**, select `main` branch and `/ (root)` folder.
4. Click **Save**.
5. Your system is live at:
   `https://USERNAME.github.io/SAD-EquipmentBorrowing-Lastname/`

---

## 12. Project Structure
```
SAD-EquipmentBorrowing-Lastname/
├── index.html                   # Main dashboard, equipment catalog, and borrowing portal
├── login.html                   # Authenticated custodian login page
│
├── css/
│   └── style.css                # Global responsive stylesheets & design system
│
├── js/
│   ├── supabase.js              # Supabase client init, API storage & UI utilities
│   ├── auth.js                  # Login, session checking, logout, & route protection
│   ├── equipment.js             # Equipment CRUD, search, filter, & safety checks
│   └── transactions.js          # Borrowing, return logic, overdue calculation & metrics
│
├── database/
│   └── schema.sql               # PostgreSQL tables, RLS policies, indexes & sample seeds
│
├── documentation/
│   ├── use-case.md              # Use case specifications & Mermaid diagrams
│   ├── use-case.svg             # Standalone vector Use Case Diagram
│   ├── erd.md                   # Entity Relationship specifications & data dictionary
│   ├── erd.svg                  # Standalone vector Entity Relationship Diagram
│   ├── requirements-traceability-matrix.md # Full RTM mapping FRs to TCs
│   └── testing-results.md       # Functional test execution log (100% PASS)
│
└── README.md                    # System documentation and setup guide
```

---

## 13. Author & Course Information
- **Project:** Equipment Borrowing and Return Monitoring System
- **Subject:** Systems Analysis and Design (SAD)
- **Role:** System Custodian / Lead Developer
- **License:** Open Source for Academic and Educational Use
