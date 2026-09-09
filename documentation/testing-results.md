# Functional Testing Results

**System:** Equipment Borrowing and Return Monitoring System  
**Test Environment:** GitHub Pages / Modern Browser (Chrome, Edge, Firefox)  
**Database:** Supabase PostgreSQL & Supabase Auth  

---

## Functional Test Execution Log

| Test ID | Test Scenario | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-01** | Login with valid account credentials | User is authenticated via Supabase Auth and redirected to `index.html`. Dashboard displays active user email. | Successfully authenticated; session is stored in LocalStorage and redirected to dashboard. | **PASS** |
| **TC-02** | Add new laboratory equipment | Form validates inputs, checks asset code uniqueness, inserts into Supabase `equipment` table, and adds to UI table. | Equipment record saved to Supabase with default status `Available`. UI reflects new item. | **PASS** |
| **TC-03** | Edit existing equipment details | Modal populates current values; user updates name/category/condition; changes persist to Supabase. | Record updated in database and table refreshed without page reload. Availability remains locked. | **PASS** |
| **TC-04** | Delete equipment item | System prompts user with confirmation dialog; verifies no active borrowing exists before deleting. | Dialog displayed; safe deletion checks executed; unborrowed item deleted; borrowed item prevented from deletion. | **PASS** |
| **TC-05** | Borrow available equipment | Selected item availability changes to `Borrowed`; new row created in `borrow_transactions`; stats updated. | Transaction created with status `Borrowed`; equipment availability updated; stats recalculated dynamically. | **PASS** |
| **TC-06** | Return borrowed equipment | Clicking "Return Equipment" updates `date_returned` to today, changes status to `Returned`, and restores equipment availability to `Available`. | Transaction marked `Returned`; equipment restored to `Available`; return button disabled/completed. | **PASS** |
| **TC-07** | View late borrowing (Overdue detection) | Transactions with `due_date < current_date` and `status != 'Returned'` are highlighted with red `⚠️ OVERDUE` badge and banner. | Overdue records flagged dynamically with animated badge and counted in dashboard Overdue stat card. | **PASS** |
| **TC-08** | Real-time Search by Borrower / Asset Code | Typing into search bar instantly filters records in the table without reloading the web page. | Search query filters table rows dynamically in real time for borrower names, asset codes, and equipment names. | **PASS** |
| **TC-09** | Filter transactions by status | Selecting "Borrowed", "Returned", or "Overdue" filters the list to only matching records. | Table displays exclusively matching transactions; count and empty states respond accurately. | **PASS** |
| **TC-10** | Open deployment URL on GitHub Pages | System loads correctly as a static website on GitHub Pages; all assets and Supabase API calls work. | Static site loads cleanly without backend runtime; responsive navigation and full CRUD functionality confirmed. | **PASS** |

---

## Test Summary
- **Total Test Cases:** 10
- **Passed:** 10
- **Failed:** 0
- **Overall Result:** **100% PASS**
