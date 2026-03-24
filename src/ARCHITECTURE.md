# Code Enforce - Multi-Tenant Architecture

## System Structure

This application follows a **multi-tenant, SaaS model** similar to CloudPermit and PermitEyes:

### Three-Tier User Hierarchy

1. **Super Admin** (`role: "superadmin"`)
   - No `municipality_id` assigned
   - Can create, read, update, delete all municipalities
   - Can invite and manage users across all municipalities
   - Can modify global app settings and features
   - Has access to system-wide analytics and reporting

2. **Municipal Admin** (`role: "admin"`, with `municipality_id`)
   - Assigned to a specific municipality
   - Can manage users within their municipality
   - Can update municipality profile and settings
   - Can view all cases and data for their municipality
   - Can access all admin tools within their scope

3. **Municipal Staff** (`role: "user"`, with `municipality_id`)
   - Assigned to a specific municipality
   - Can create cases, investigations, documents
   - Can view data relevant to their municipality
   - Limited permissions based on business logic

## User Management Flow

### Signup & Access Control
- New users sign up and are initially **not assigned** to any municipality
- SuperAdmins review pending access requests in **SuperAdminUsers** page
- SuperAdmin assigns user to a municipality → sends invitation → user gains access
- Users without municipality assignment see **PendingApprovalScreen**
- SuperAdmins are redirected to **SuperAdminHome** (cannot access municipal console)

### Invitations
- **SuperAdmin invites users**: Uses **SuperAdminUsers** page → `inviteMunicipalityUser` function
- **Municipal Admin invites users**: Uses **AdminTools** → **Users tab** → `inviteMunicipalityUser` function
- Both flows send personalized email with welcome message

## Data Isolation (RLS)

All entities enforce **municipality-level isolation** via Row-Level Security (RLS):

```json
{
  "read": {
    "$or": [
      { "data.municipality_id": "{{user.municipality_id}}" },
      { "user_condition": { "role": "superadmin" } }
    ]
  }
}
```

**Key principle**: Every entity (Case, Investigation, Notice, Document, etc.) has a `municipality_id` field that controls access.

### Entities with RLS
- Case, Investigation, Notice, Document, CourtAction, Deadline, AuditLog, Resource, TownConfig
- All use `{{user.municipality_id}}` to restrict reads to the user's municipality
- SuperAdmins bypass restrictions via `user_condition: { role: "superadmin" }`

## Routing Architecture

### Super Admin Routes (No AppLayout)
```
/superadmin        → SuperAdminHome (municipalities list, management)
/superadmin/users  → SuperAdminUsers (global user management)
```

### Municipal Routes (With AppLayout)
```
/                  → Dashboard
/cases             → Cases List
/cases/:id         → Case Detail
/new-complaint     → Create Case
/investigations    → Investigations
/deadlines         → Deadlines
/court-actions     → Court Actions
/wizard            → Action Wizard
/compass           → Compass AI
/resources         → Resource Library
/documents         → Document Vault
/admin             → Admin Tools (municipal-scoped)
/setup             → Municipality Setup
/public-portal     → Public Portal (no auth required)
```

## Authentication Context (AuthContext)

```javascript
{
  user,                      // Current authenticated user
  municipality,              // User's assigned municipality
  isAuthenticated,           // Boolean
  authError,                 // Auth error object if present
  isLoadingAuth,            // Loading state
  isLoadingPublicSettings,  // App settings loading
  logout(),                  // Logout function
  navigateToLogin(),        // Redirect to login
  reloadMunicipality(),     // Refresh municipality data
}
```

**Key difference from old design**: `impersonateMunicipality` is removed. SuperAdmins do NOT impersonate municipalities; they manage them from the SuperAdmin console.

## User Assignment Flow (Step-by-Step)

1. **User signs up** → Base44 auth creates account with `role: "user"`, no `municipality_id`
2. **User sees PendingApprovalScreen** → Cannot access app
3. **SuperAdmin goes to /superadmin/users** → sees "Pending Access" section
4. **SuperAdmin clicks municipality dropdown** → selects a municipality
5. **`updateUserMunicipality` function runs** → assigns `municipality_id` + `municipality_name`
6. **Invitation email sent** → user is now approved
7. **User logs back in** → AuthContext loads municipality
8. **User sees Municipal Console** → Dashboard, Cases, etc.

## Backend Functions

### User Management Functions
- `getUsers.js` → Lists users (filtered by role)
- `updateUserMunicipality.js` → Assigns user to municipality (SuperAdmin only)
- `inviteMunicipalityUser.js` → Invites user to specific municipality + sends email
- `adminResetPassword.js` → Password reset utility

### Municipality Functions
- `createMunicipality.js` → Creates new municipality (SuperAdmin or self-onboarding)
- `updateMunicipality.js` → Updates municipality details

### Case Management Functions
- `populateSampleCases.js` → Seeds sample cases when municipality is created
- `deleteCaseWithChildren.js` → Cascading delete (case + related records)
- `logAudit.js` → Audit logging

### Notification Functions
- `notifyAdminNewUser.js` → Alerts SuperAdmins of new pending users
- `deadlineReminders.js` → Scheduled deadline notifications

## Database Schema (Key Fields)

### User Entity
```json
{
  "id": "uuid",                  // Built-in
  "email": "string",             // Built-in
  "full_name": "string",         // Built-in
  "role": "superadmin|admin|user",
  "municipality_id": "uuid|null",
  "municipality_name": "string|null",
  "title": "string",
  "invitation_accepted": "boolean"
}
```

### Municipality Entity
```json
{
  "id": "uuid",
  "name": "string",
  "short_name": "string",
  "municipality_type": "town|city|village|borough|township|county",
  "state": "string",
  "address": "string",
  "contact_email": "string",
  "contact_phone": "string",
  "website": "string",
  "logo_url": "string",
  "tagline": "string",
  "primary_color": "string",  // Hex for future customization
  "onboarding_complete": "boolean",
  "is_active": "boolean",
  "admin_email": "string",
  "notes": "string"
}
```

### Case Entity (Example)
```json
{
  "id": "uuid",
  "municipality_id": "uuid",  // RLS Filter
  "case_number": "string",
  "status": "string",
  "complaint_date": "date",
  ...
}
```

## Security Principles

1. **Never bypass RLS on frontend** → All entity queries respect municipality_id
2. **Service role only for backend functions** → Frontend uses user-scoped SDK
3. **SuperAdmins explicitly exempt in RLS** → Via `user_condition: { role: "superadmin" }`
4. **Email is unique auth identifier** → Used in invitations and password resets
5. **Audit logging for all case modifications** → Via `logAudit` function
6. **No hardcoded access tokens** → Use Base44 SDK auth patterns

## Common Tasks

### Add new field to Case
1. Update `entities/Case.json` schema
2. No RLS changes needed (municipality_id already filters)
3. Update `pages/CaseDetail` form if user-facing

### Create new admin utility
1. Create new page in `/pages` with admin-only check
2. Add to AdminTools tabs if municipal-scoped
3. Add to SuperAdminHome if global

### Invite a user as SuperAdmin
1. Go to `/superadmin/users`
2. Click "Invite User" button
3. Select municipality + role
4. System sends email automatically

### Invite a user as Municipal Admin
1. Go to `/admin` → **Users** tab
2. Click "Send Invite" button
3. User is automatically assigned to your municipality

## Future Enhancements

- Branding customization per municipality (primary_color, custom fonts)
- Role-based feature toggles (some municipalities enable Compass AI, others don't)
- Usage analytics per municipality
- Bulk user imports via CSV
- Department-level user groups within municipalities
- Custom workflow stages per municipality