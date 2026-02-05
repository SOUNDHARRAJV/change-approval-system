# Change Approval System - Demo Login Credentials

## System Overview
The Change Approval System is a three-role based application with complete separation of concerns:

### **PART 1: USER (Blue) - Submit Requests**
- Submit change requests
- View their own requests
- Track status of their submissions
- Receive notifications when requests are reviewed

### **PART 2: REVIEWER (Green) - Review & Approve**
- View pending/under-review requests
- Approve or reject change requests
- Add comments to requests
- Notify requesters of decisions

### **PART 3: ADMIN (Red/Dark) - Full Management**
- Manage all change requests
- Assign reviewers to requests
- Update request statuses
- **User Management** with 3 sections:
  - **Admins** - Manage other admin accounts
  - **Reviewers** - Manage reviewer accounts
  - **Users** - Manage regular user accounts
- **Delete** users and requests (with confirmation)

---

## Demo Login Credentials

### Regular Users (2 accounts)
| Email | Password | Name | Role |
|-------|----------|------|------|
| user@demo.com | demo123 | John Smith | USER |
| user2@demo.com | demo123 | Sarah Johnson | USER |

### Reviewers (2 accounts)
| Email | Password | Name | Role |
|-------|----------|------|------|
| reviewer@demo.com | demo123 | Mike Chen | REVIEWER |
| reviewer2@demo.com | demo123 | Lisa Williams | REVIEWER |

### Admins (2 accounts)
| Email | Password | Name | Role |
|-------|----------|------|------|
| admin@demo.com | demo123 | Admin User | ADMIN |
| admin2@demo.com | demo123 | Super Admin | ADMIN |

---

## How to Test the System

### 1. Test as a USER
1. Login with `user@demo.com` / `demo123`
2. Create a new change request
3. Fill in title, description, and priority
4. Submit the request
5. **Reviewers and Admins automatically notified**

### 2. Test as a REVIEWER
1. Login with `reviewer@demo.com` / `demo123`
2. View pending requests
3. Open a request to review
4. Add comments (optional)
5. Approve or reject the request
6. **User automatically notified of decision**

### 3. Test as an ADMIN
1. Login with `admin@demo.com` / `demo123`
2. **Change Requests Tab**
   - View all requests
   - Assign reviewers to requests
   - Update request status
   - Delete requests (with confirmation)
3. **User Management Tab** - 3 sections:
   - **ADMINS section** - Red colored cards
     - Manage other admin accounts
     - Enable/disable accounts
     - Delete admin users
   - **REVIEWERS section** - Green colored cards
     - Manage reviewer accounts
     - Enable/disable accounts
     - Delete reviewers
   - **USERS section** - Blue colored cards
     - Manage regular user accounts
     - Enable/disable accounts
     - Delete users

---

## Key Features

### Notifications
- ✅ Users notified when request is submitted
- ✅ Reviewers notified when request is assigned
- ✅ Users notified when request is approved/rejected
- ✅ All notifications viewable in dashboard

### Data Management
- ✅ Persistent storage using browser localStorage
- ✅ No database setup required
- ✅ All data saved locally
- ✅ Works offline

### User Management
- ✅ Three-section user management in admin
- ✅ Enable/disable user accounts
- ✅ Delete users with cascade (removes all related data)
- ✅ Color-coded sections for easy identification

---

## Testing Workflow Example

1. **Create Request** (as John Smith)
   - User: john@demo.com submits "Update Database Schema"
   - Reviewers & Admins automatically notified

2. **Assign Reviewer** (as Admin)
   - Admin opens request
   - Assigns Mike Chen as reviewer
   - Mike Chen notified of assignment

3. **Review & Approve** (as Mike Chen)
   - Reviewer opens assigned request
   - Adds comment: "Looks good, approved"
   - Changes status to "approved"
   - John Smith notified of approval

4. **Manage Users** (as Admin)
   - Click "User Management" tab
   - Navigate through Admins, Reviewers, Users sections
   - Can manage, enable/disable, or delete users

---

## Notes
- All data is stored in browser's localStorage
- Data persists across page refreshes
- Clearing browser cache will reset all data
- Demo accounts are recreated on each fresh browser session
