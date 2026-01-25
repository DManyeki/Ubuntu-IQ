# Firebase to Supabase Migration Guide

## 🚀 Quick Start

Follow these steps in order to migrate your Firebase data to Supabase:

### Step 1: Download Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/project/ubuntu-mind-440cf/settings/serviceaccounts/adminsdk)
2. Click "Generate New Private Key"
3. Save as `firebase-service-account.json` in the project root

### Step 2: Export Firebase Data

```powershell
npx tsx scripts/migration/export-firebase.ts
```

This will export:
- ✅ All Firebase Auth users
- ✅ All Firestore `users` collection data
- ✅ Data saved to `scripts/migration/data/`

### Step 3: Import to Supabase

```powershell
npx tsx scripts/migration/import-to-supabase.ts
```

This will:
- ✅ Create users in Supabase Auth
- ✅ Create user profiles in `user_profiles` table
- ✅ Link Firebase UIDs for reference

### Step 4: Test the Migration

The app is already updated to use Supabase! Just restart the dev server:

```powershell
# Stop the current server (Ctrl+C)
npm run dev
```

Try logging in with a migrated account.

---

## ✅ What's Been Changed

### Code Updates (Already Done)
- ✅ `context/AuthContext.tsx` - Now uses Supabase Auth
- ✅ All auth logic updated
- ✅ User profiles stored in Supabase

### Firebase Files (Still Present)
- ⏳ `services/firebaseConfig.ts` - Can delete after testing
- ⏳ `services/authService.ts` - No longer used
- ⏳ Firebase config files - Keep for 1 month as backup

---

## 🧪 Testing Checklist

After migration, test these features:

- [ ] User can log in with existing credentials
- [ ] User can sign up (new users)
- [ ] User can log out
- [ ] RIASEC assessment saves correctly
- [ ] Mood assessment saves correctly
- [ ] Chat history works
- [ ] All user data is preserved

---

## 📋 Important Notes

1. **Passwords**: Users keep their passwords (authentication is migrated)
2. **UIDs**: New Supabase UIDs are created, but Firebase UIDs are stored for reference
3. **Data**: All assessment data is preserved in `user_profiles` table
4. **Backwards Compatibility**: Original Firebase data stays untouched

---

## 🆘 Troubleshooting

### "Service account key not found"
- Download the key from Firebase Console
- Place in project root as `firebase-service-account.json`

### "User already exists"
- This is normal if you run import twice
- Script will skip existing users

### "No matching auth user"
- Some Firestore profiles might not have corresponding auth users
- These are skipped automatically

---

## 🎉 After Migration

Once testing is complete:

1. **Keep Firebase read-only** for 1 month (for rollback)
2. **Remove Firebase dependencies**:
   ```powershell
   npm uninstall firebase
   ```
3. **Delete Firebase files**:
   - `services/firebaseConfig.ts`
   - `services/authService.ts`
   - `firebase.json`
   - `.firebaserc`

4. **Update `.gitignore`**:
   ```
   firebase-service-account.json
   scripts/migration/data/
   ```
