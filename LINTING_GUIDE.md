# ESLint Import Validation Guide

## Quick Start

### Run Linting

```bash
# Check all files for linting issues
npm run lint

# Auto-fix issues (where possible)
npm run lint:fix

# Focus only on import issues
npm run lint:imports
```

### In Your Editor

Most editors (VS Code, WebStorm, etc.) will automatically show ESLint errors. Make sure you have the ESLint extension installed.

---

## Key Import Validation Rules

### ✅ `import/no-unresolved` (ERROR)
**Catches:** Missing imports, incorrect file paths, typos in import paths

**Examples:**
```javascript
// ❌ ERROR: File doesn't exist
import dataService from '../dataServiceX';  // Wrong file name

// ❌ ERROR: Wrong path depth
import authService from '../authService';  // In components/auth/, needs '../../'

// ✅ CORRECT
import authService from '../../authService';
```

### ✅ `import/named` (ERROR)
**Catches:** Importing named exports that don't exist

### ✅ `import/default` (ERROR)
**Catches:** Importing default export that doesn't exist

### ✅ `import/no-duplicates` (ERROR)
**Catches:** Duplicate imports from the same module

```javascript
// ❌ ERROR
import { useState } from 'react';
import { useEffect } from 'react';

// ✅ CORRECT
import { useState, useEffect } from 'react';
```

### ⚠️ `import/order` (WARNING)
**Enforces:** Consistent import ordering (built-in → external → internal → relative)

**Auto-fixable:** Run `npm run lint:fix` to auto-organize imports

---

## Common Import Path Patterns

### Root-level Files (`components/`, root)
```javascript
import dataService from '../dataService';
import authService from '../authService';
```

### Files in `components/auth/`, `components/student/`, etc.
```javascript
import dataService from '../../dataService';
import authService from '../../authService';
import Logo from '../../assets/logo.png';
```

### Files in Nested Folders (3+ levels deep)
```javascript
// In components/student/messages/MessageCard.js
import ClassInvitations from '../invitations';
import dataService from '../../../dataService';
```

---

## What Gets Caught

### ✅ Will Catch:
- ❌ Missing files: `import something from './nonexistent'`
- ❌ Wrong path depth: `import x from '../x'` when it should be `../../x`
- ❌ Typos: `import dataservice from '../dataService'`
- ❌ Missing exports: `import { nonexistent } from './file'`
- ❌ Duplicate imports
- ⚠️ Import ordering (optional, auto-fixable)

### ❌ Won't Catch:
- Runtime errors (test your app!)
- Type errors (use TypeScript for that)
- Logic errors

---

## Configuration

The ESLint config is in `.eslintrc.js`. Key settings:

- **Import resolver:** Configured to understand React Native module resolution
- **Ignored packages:** React Native, Expo, and third-party packages are ignored (as they should be)
- **File extensions:** `.js`, `.jsx`, `.json` are recognized

---

## Auto-Fixing

Many issues can be auto-fixed:

```bash
# Fix import ordering, spacing, etc.
npm run lint:fix
```

**Note:** `import/no-unresolved` errors cannot be auto-fixed - you need to correct the paths manually.

---

## Integration with Git

### Pre-commit Hook (Optional)

To prevent committing code with import errors, add a pre-commit hook:

```bash
# Install husky (optional)
npm install --save-dev husky

# Add to package.json:
"husky": {
  "hooks": {
    "pre-commit": "npm run lint"
  }
}
```

---

## Troubleshooting

### "Module not found" but file exists
1. Check the path depth (`../` vs `../../`)
2. Verify file extension (`.js` not needed, but must match actual file)
3. Check `.eslintignore` - file might be ignored
4. Restart ESLint server in your editor

### Too many warnings about import order
- Run `npm run lint:fix` to auto-organize
- Or disable the rule if not important to you

### False positives from React Native packages
- These are already ignored in `.eslintrc.js` settings
- If you see errors for `react-native-*`, check the `import/ignore` array

---

## Best Practices

1. **Run linting before committing:**
   ```bash
   npm run lint
   ```

2. **Fix imports immediately** when you see errors - don't ignore them

3. **Use auto-fix** for import ordering:
   ```bash
   npm run lint:fix
   ```

4. **Check editor integration** - most IDEs will show errors inline

---

## Examples of Errors You'll See

```
❌ Unable to resolve "../dataService" from "components/student/StudentProfile.js"
   → Fix: Change to "../../dataService"

❌ import/no-unresolved: Unable to resolve path to module './ClassInvitations'
   → Fix: Check file exists and path is correct

❌ import/no-duplicates: 'react' imported multiple times
   → Fix: Combine imports: import { useState, useEffect } from 'react';
```

---

**Happy linting! 🎯**

