# Admin Dashboard - Manage Features Working Guide

## How to Test Admin Dashboard Manage Features

### Prerequisites
- Login as Admin: `admin@demo.com` / `demo123`
- Navigate to Admin Dashboard
- Click on "User Management" tab to see users, or stay on "Change Requests" tab

---

## CHANGE REQUESTS Management

### How to Manage a Change Request:

1. **View All Requests**
   - Stay on the "Change Requests" tab
   - See all requests from all users displayed

2. **Click "Manage" Button**
   - Click the blue "Manage" button on any request
   - Modal should pop up with request details

3. **In the Request Modal, you can:**

   **a) Assign a Reviewer**
   - Dropdown: "Assign Reviewer"
   - Select from available reviewers
   - Or select "No Reviewer" to unassign
   - Reviewer automatically notified

   **b) Update Status**
   - Dropdown: "Update Status"
   - Options: Pending, Under Review, Approved, Rejected
   - User automatically notified of status change

   **c) Delete Request**
   - Click red "Delete" button
   - Confirmation dialog appears
   - Request deleted with all comments/notifications

4. **Close Modal**
   - Click "Close" button or click outside modal

---

## USER MANAGEMENT (3 Sections)

### How to Manage Users:

1. **Click "User Management" Tab**
   - Three sub-tabs appear:
     - 🔴 **ADMINS** (Red cards)
     - 🟢 **REVIEWERS** (Green cards)  
     - 🔵 **USERS** (Blue cards)

2. **Select a User Section**
   - Click on "ADMINS", "REVIEWERS", or "USERS" tab
   - Users in that role appear as colored cards

3. **Click "Manage" Button on Any User**
   - Modal pops up with user details
   - Shows user name, email, role, and status

4. **In the User Modal, you can:**

   **a) Toggle Account Status**
   - Click "Disable Account" (if active)
   - Click "Enable Account" (if disabled)
   - Toast confirmation appears

   **b) Delete User**
   - Click red "Delete User" button
   - Confirmation dialog: "Are you sure you want to delete this user? All their data will be removed."
   - Click OK to confirm deletion
   - All user's requests, comments, notifications removed
   - Toast confirmation appears

   **c) Close Modal**
   - Click "Close" button

---

## If Manage Buttons Don't Work

### Solution 1: Hard Refresh Browser
1. Press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac)
2. This clears cache and reloads the page
3. Login again
4. Try clicking Manage buttons

### Solution 2: Clear Browser Storage
1. Open DevTools (F12)
2. Go to Application > Local Storage
3. Right-click and "Clear All"
4. Refresh page
5. Login again

### Solution 3: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for any red error messages
4. Screenshot and share error

---

## Expected Behavior After Each Action

| Action | Expected Result |
|--------|-----------------|
| Click "Manage" on Request | Request modal opens with title, description, badges |
| Click "Manage" on User | User modal opens with name, email, role badge |
| Assign Reviewer | Toast: "Reviewer assigned successfully", Data updates |
| Update Request Status | Toast: "Status updated successfully", Data updates |
| Delete Request | Confirmation dialog → Toast: "Request deleted successfully" |
| Toggle User Status | Toast: "User enabled/disabled successfully" |
| Delete User | Confirmation dialog → Toast: "User deleted successfully" |
| Close Modal | Modal closes, data reloads |

---

## Testing Workflow Example

### Step 1: Create a Request (as User)
```
Login: user@demo.com / demo123
→ Click "New Request"
→ Fill title, description, priority
→ Click "Submit Request"
```

### Step 2: Manage Request (as Admin)
```
Login: admin@demo.com / demo123
→ Admin Dashboard → "Change Requests" tab
→ Find the request you created
→ Click "Manage" button
→ Assign a reviewer
→ Change status to "under_review"
→ Close modal
```

### Step 3: Manage Users (as Admin)
```
Still on Admin Dashboard
→ Click "User Management" tab
→ See "ADMINS", "REVIEWERS", "USERS" tabs
→ Click on "USERS" tab
→ Find user@demo.com (John Smith)
→ Click "Manage"
→ Toggle status or delete
→ Confirm action
```

---

## Features That Should Work

✅ View all change requests  
✅ Assign reviewers to requests  
✅ Update request status  
✅ Delete requests  
✅ View users in 3 role-based sections  
✅ Enable/Disable user accounts  
✅ Delete users with cascade deletion  
✅ Toast notifications for all actions  
✅ Modal dialogs open/close properly  
✅ Data persists in localStorage  

---

## If Still Having Issues

Please check:
1. Browser shows no JavaScript errors (Console tab in DevTools)
2. Network requests work (no 404 errors in Network tab)
3. localStorage has data (Application > Local Storage > cas_users, cas_change_requests)
4. Admin role is set correctly for your user
