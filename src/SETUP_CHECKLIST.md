# Code Enforce - Setup & Verification Checklist

## Pre-Launch Verification

### 1. Authentication Flow ✓
- [x] SuperAdmins bypass municipality requirement (logged in → SuperAdminHome)
- [x] Regular users without municipality → PendingApprovalScreen
- [x] Regular users with municipality → Municipal Console (Dashboard)
- [x] Public Portal accessible without auth (/public-portal)

### 2. User Management ✓
- [x] SuperAdminUsers page for system-wide user management
- [x] AdminTools → Users tab for municipal user management
- [x] inviteMunicipalityUser function sends welcome emails
- [x] updateUserMunicipality assigns users to municipalities
- [x] Invitation flow is smooth and clear

### 3. Data Isolation ✓
- [x] All case-related entities have RLS with municipality_id filter
- [x] SuperAdmins can access all data via user_condition
- [x] Regular users can only see their municipality's data
- [x] getUsers function filters correctly

### 4. Routing ✓
- [x] SuperAdmin routes don't use AppLayout
- [x] Municipal routes all use AppLayout
- [x] No impersonation pattern (removed)
- [x] SuperAdminHome includes link to Users management
- [x] /admin only shows for municipal admins

### 5. Backend Functions
- [x] inviteMunicipalityUser.js created
- [x] getUsers.js filters by municipality
- [x] updateUserMunicipality.js assigns properly
- [x] createMunicipality.js works for superadmin + self-onboarding
- [x] populateSampleCases.js seeds cases with municipality_id

### 6. Email Communications ✓
- [x] New user signup → no email (pending approval)
- [x] SuperAdmin assigns user → invitation email sent
- [x] Email includes welcome message + accept link
- [x] Deadline reminders working

### 7. Security ✓
- [x] No hardcoded credentials
- [x] RLS enforced on all entities
- [x] SuperAdmin role required for system-wide operations
- [x] Audit logging for case modifications
- [x] Password reset flow available

## First-Time Setup Steps

### Step 1: Create First SuperAdmin
1. Invite yourself to the app via Base44 dashboard with `role: "superadmin"`
2. Log in with Base44 credentials
3. You should see SuperAdminHome

### Step 2: Create First Municipality
1. From SuperAdminHome, click "New Municipality"
2. Fill in name, state, contact email
3. Click "Create"
4. System automatically seeds sample cases

### Step 3: Invite Municipal Admin
1. From SuperAdminHome, click "All Users" button
2. Click "Invite User"
3. Enter their email, select the municipality, select "Admin" role
4. They receive invitation email

### Step 4: Test Municipal Admin Login
1. Municipal admin logs in with their Base44 credentials
2. They see the Municipal Console
3. They can access AdminTools → Users tab
4. They can invite staff to their municipality

### Step 5: Invite Municipal Staff
1. As Municipal Admin, go to AdminTools → Users
2. Click "Send Invite"
3. Enter staff email (no role selection—defaults to "user")
4. Staff receives invitation email

### Step 6: Test Staff Login
1. Staff logs in with their Base44 credentials
2. They see the Municipal Console (Dashboard)
3. They can create cases, investigations, documents
4. They cannot access AdminTools

## Common Troubleshooting

### "User cannot log in"
**Check:**
- Is their Base44 account created? (Login to base44.com)
- Are they invited to the app? (Check Users in Base44 dashboard)
- If regular user: Are they assigned to a municipality? (SuperAdminUsers page)

### "User sees 'Access Request Pending'"
**This is correct.** They need to be assigned to a municipality by a superadmin.

### "Municipal data is leaking to other municipalities"
**Check:**
- Does the entity have `municipality_id` field?
- Is RLS configured with `data.municipality_id` filter?
- Run test query: `base44.entities.Case.list()` should only return current user's municipality

### "SuperAdmin can't see all municipalities"
**Check:**
- SuperAdmin role is set correctly
- They're accessing /superadmin, not /admin
- Their `municipality_id` should be null

## Performance Notes

- User listings are filtered in `getUsers.js` (not RLS, but application-level)
- This prevents querying all users for every municipality admin
- Audit logs are indexed by case_id for fast filtering
- Sample data (8 cases) is created per municipality for onboarding

## Future Configuration

These are settings ready for future customization:

- **Municipality.primary_color** → Use for custom branding per municipality
- **Municipality.onboarding_complete** → Track setup progress
- **User.title** → Display job titles in team directory
- **TownConfig** → Municipality-specific enforcement settings
- **Resource** → Custom ordinances per municipality

## Monthly Maintenance

- [ ] Review audit logs for compliance
- [ ] Check inactive users (AdminTools)
- [ ] Verify sample cases were removed (auto-created only for new municipalities)
- [ ] Test password reset flow
- [ ] Test email notifications