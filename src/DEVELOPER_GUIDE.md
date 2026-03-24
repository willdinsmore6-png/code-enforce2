# Developer Quick Reference

## Project Structure

```
src/
├── pages/
│   ├── SuperAdminHome.jsx          # SuperAdmin: manage municipalities
│   ├── SuperAdminUsers.jsx         # SuperAdmin: manage all users
│   ├── AdminTools.jsx              # Municipal admin: local settings
│   ├── Dashboard.jsx               # Main app home
│   ├── Cases.jsx                   # Cases list
│   ├── CaseDetail.jsx              # Case details
│   └── ...other pages
├── components/
│   ├── layout/
│   │   └── AppLayout.jsx           # Municipal console layout
│   ├── PendingApprovalScreen.jsx   # Pending user screen
│   └── ...other components
├── lib/
│   ├── AuthContext.jsx             # Auth state management
│   └── ...utilities
├── functions/
│   ├── inviteMunicipalityUser.js   # Invite + email
│   ├── getUsers.js                 # User listing (filtered)
│   ├── updateUserMunicipality.js   # Assign user
│   ├── createMunicipality.js       # Create municipality
│   └── ...other functions
├── entities/
│   ├── User.json                   # User schema (role, municipality_id)
│   ├── Municipality.json           # Municipality schema
│   ├── Case.json                   # Case schema (with RLS)
│   └── ...other entities
└── App.jsx                         # Router configuration
```

## Key Concepts

### User Roles
```javascript
// Superadmin
{
  role: "superadmin",
  municipality_id: null,  // ← null for superadmins
  email: "..."
}

// Municipal Admin
{
  role: "admin",
  municipality_id: "uuid-123",
  email: "..."
}

// Municipal Staff
{
  role: "user",
  municipality_id: "uuid-123",
  email: "..."
}
```

### Auth Context Hook
```javascript
import { useAuth } from '@/lib/AuthContext';

export default function MyComponent() {
  const { user, municipality, isAuthenticated, logout } = useAuth();
  
  // user.role → "superadmin" | "admin" | "user"
  // municipality → { id, name, short_name, ... }
  // isAuthenticated → boolean
  
  return <div>{user?.email}</div>;
}
```

### Routing Guard
```javascript
// SuperAdmin access only
if (user?.role !== 'superadmin') {
  return <div>Access denied</div>;
}

// Municipal admin access only
if (user?.role !== 'admin') {
  return <div>Admin only</div>;
}

// Require municipality assignment
if (!municipality?.id) {
  return <div>No municipality assigned</div>;
}
```

## Common Tasks

### Invite a User (SuperAdmin)
```javascript
// From SuperAdminUsers page
await base44.functions.invoke('inviteMunicipalityUser', {
  email: 'user@example.com',
  role: 'admin',  // or 'user'
  municipality_id: 'uuid-123'
});
// Automatically sends email with welcome message
```

### Invite a User (Municipal Admin)
```javascript
// From AdminTools → Users tab (same function)
await base44.functions.invoke('inviteMunicipalityUser', {
  email: 'staff@example.com',
  role: 'user',
  municipality_id: municipality.id  // Their own municipality
});
```

### Check User Permissions
```javascript
const { user, municipality } = useAuth();

const isSuperAdmin = user?.role === 'superadmin';
const isAdmin = user?.role === 'admin';
const isStaff = user?.role === 'user';
const hasMunicipality = !!municipality?.id;
```

### Fetch Data with RLS
```javascript
import { base44 } from '@/api/base44Client';

// Automatically filtered by RLS to current user's municipality
const cases = await base44.entities.Case.list();

// Filter further by user-provided criteria
const openCases = await base44.entities.Case.filter({
  status: 'intake'
});

// Note: These are subject to RLS
// - SuperAdmins see all
// - Municipal users see only their municipality
```

### Create a New Entity
```javascript
// 1. Add schema to entities/MyEntity.json
{
  "name": "MyEntity",
  "type": "object",
  "properties": {
    "municipality_id": { "type": "string" },
    "name": { "type": "string" },
    ...
  },
  "required": ["municipality_id", "name"],
  "rls": {
    "read": {
      "$or": [
        { "data.municipality_id": "{{user.municipality_id}}" },
        { "user_condition": { "role": "superadmin" } }
      ]
    },
    "create": {
      "$or": [
        { "data.municipality_id": "{{user.municipality_id}}" },
        { "user_condition": { "role": "superadmin" } }
      ]
    },
    "update": {
      "$or": [
        { "data.municipality_id": "{{user.municipality_id}}" },
        { "user_condition": { "role": "superadmin" } }
      ]
    },
    "delete": {
      "$or": [
        { "data.municipality_id": "{{user.municipality_id}}", "user_condition": { "role": "admin" } },
        { "user_condition": { "role": "superadmin" } }
      ]
    }
  }
}

// 2. Use in components
const { municipality } = useAuth();
await base44.entities.MyEntity.create({
  municipality_id: municipality.id,
  name: 'Example'
});
```

### Backend Function with Auth Check
```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Check superadmin
    if (user?.role !== 'superadmin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Check municipality assignment
    if (!user?.municipality_id && user?.role !== 'superadmin') {
      return Response.json({ error: 'No municipality' }, { status: 403 });
    }
    
    // Use service role for admin operations
    const munis = await base44.asServiceRole.entities.Municipality.list();
    
    return Response.json({ munis });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

## Email Sending
```javascript
// From backend function
await base44.asServiceRole.integrations.Core.SendEmail({
  to: 'user@example.com',
  subject: 'Welcome to Code Enforce',
  body: `<html>Your HTML email here</html>`
});

// Use from frontend (if allowed by permissions)
// NOTE: Usually only backend functions send emails
```

## Testing RLS
```javascript
// Test 1: User sees only their municipality's data
const cases = await base44.entities.Case.list();
console.log(cases[0].municipality_id === user.municipality_id);  // should be true

// Test 2: SuperAdmin sees all (RLS bypassed)
// (Log in as superadmin and verify you can access via SDK)

// Test 3: Cross-municipality access denied
// User in Muni A tries to access Case in Muni B
// Should return empty array (RLS enforces)
```

## Debugging Tips

### Check User State
```javascript
const { user, municipality, isLoadingAuth } = useAuth();
console.log({ user, municipality, isLoadingAuth });
```

### Check Route Protection
```javascript
// In App.jsx AuthenticatedApp component
console.log('User role:', user?.role);
console.log('Municipality:', municipality?.id);
// Verify routing logic matches expected path
```

### Check RLS
```javascript
// Query entity with wrong municipality_id in RLS
const result = await base44.entities.Case.filter({
  id: 'some-id',
  municipality_id: 'wrong-id'
});
console.log(result.length);  // should be 0 (RLS prevented it)
```

## Performance Considerations

- **User listing**: Filtered in `getUsers.js` for efficiency
- **Entity queries**: Use `.filter()` for specific records instead of `.list()` when possible
- **Audit logs**: Indexed by case_id for fast lookups
- **Sample cases**: 8 cases created per municipality (consider removing after onboarding)

## Common Pitfalls

❌ **Don't:** Directly compare user role without null checks
```javascript
if (user.role === 'admin') { }  // ← Can throw if user is null
```

✓ **Do:**
```javascript
if (user?.role === 'admin') { }
```

❌ **Don't:** Forget `municipality_id` when creating entities
```javascript
await base44.entities.Case.create({
  violation_type: 'zoning'  // ← Missing municipality_id!
});
```

✓ **Do:**
```javascript
await base44.entities.Case.create({
  municipality_id: municipality.id,
  violation_type: 'zoning'
});
```

❌ **Don't:** Use impersonation pattern (removed)
```javascript
impersonateMunicipality(muni);  // ← This function no longer exists
```

✓ **Do:**
```javascript
// Municipality is automatically set based on user assignment
const { municipality } = useAuth();
```

❌ **Don't:** Add users to superadmin role via invite
```javascript
await base44.users.inviteUser(email, 'superadmin');  // ← May not work via frontend
```

✓ **Do:**
```javascript
// Invite superadmins via Base44 dashboard
// Only invite regular admins and staff via inviteMunicipalityUser()
```

## Resources

- See **ARCHITECTURE.md** for system design
- See **SETUP_CHECKLIST.md** for setup & testing
- See **MIGRATION_SUMMARY.md** for what changed
- See entity RLS examples in `/entities/*.json`
- See function examples in `/functions/*.js