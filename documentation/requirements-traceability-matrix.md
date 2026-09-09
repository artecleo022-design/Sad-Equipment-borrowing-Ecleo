# Requirements Traceability Matrix (RTM)

**Project Name:** Equipment Borrowing and Return Monitoring System  
**Course / Subject:** Systems Analysis and Design (SAD) / College Laboratory Project  
**Author:** System User / Laboratory Custodian  

---

## 1. Traceability Table

| Functional Requirement ID | Requirement Description | Use Case / Feature | Test Case ID | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **FR-01** | System User Authentication & Session Protection | User Login / Logout | TC-01 | **PASS** |
| **FR-02** | Add New Laboratory Equipment Record | Add Equipment | TC-02 | **PASS** |
| **FR-03** | Edit & Update Existing Equipment Record | Edit Equipment | TC-03 | **PASS** |
| **FR-04** | Safe Deletion of Equipment Record with Confirmation | Delete Equipment | TC-04 | **PASS** |
| **FR-05** | Record New Borrowing for Available Equipment | Record Borrowing | TC-05 | **PASS** |
| **FR-06** | Process Equipment Return and Restore Availability | Return Equipment | TC-06 | **PASS** |
| **FR-07** | Automatic Overdue Detection for Late Borrowings | Detect Overdue | TC-07 | **PASS** |
| **FR-08** | Dynamic Real-Time Search across Equipment & Logs | Search Records | TC-08 | **PASS** |
| **FR-09** | Filter Records by Status and Availability | Filter Records | TC-09 | **PASS** |
| **FR-10** | Live Dashboard Statistical Summary Counters | Dashboard Summary | TC-10 | **PASS** |

---

## 2. Business Rules Traceability

| Business Rule ID | Description | Enforcing Component / Module |
| :--- | :--- | :--- |
| **BR-01** | Equipment name cannot be empty. | `js/equipment.js` (`handleAddEquipment`, `handleUpdateEquipment`) |
| **BR-02** | Asset code must be unique across all records. | `database/schema.sql` (UNIQUE constraint) & `js/equipment.js` |
| **BR-03** | Only available equipment may be selected for borrowing. | `js/transactions.js` (`populateAvailableEquipmentDropdown`, validation) |
| **BR-04** | Borrower name must be provided. | `js/transactions.js` (`handleRecordBorrowing`) |
| **BR-05** | Due date cannot be earlier than borrowing date. | `js/transactions.js` (`handleRecordBorrowing` date comparison) |
| **BR-06** | Newly borrowed equipment receives 'Borrowed' status. | `js/transactions.js` (`insert into borrow_transactions`) |
| **BR-07** | Borrowed equipment becomes unavailable (`availability = 'Borrowed'`). | `js/transactions.js` (`update equipment`) |
| **BR-08** | Returned equipment becomes available again (`availability = 'Available'`). | `js/transactions.js` (`handleReturnEquipment`) |
| **BR-09** | Equipment past due date without return is identified as Overdue. | `js/transactions.js` (`isTransactionOverdue`) |
| **BR-10** | Equipment deletion requires explicit user confirmation dialog. | `js/equipment.js` (`confirmDeleteEquipment`) |
| **BR-11** | Only authenticated users may manage records and access dashboard. | `js/auth.js` (`checkSessionAndProtectRoute`) & Supabase RLS |
| **BR-12** | A returned transaction cannot be returned a second time. | `js/transactions.js` (`handleReturnEquipment` idempotency check) |
