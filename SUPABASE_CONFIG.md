# Supabase Configuration for Production

## Important: Update Supabase Dashboard Settings

To ensure email verification links point to your production domain (`hisabkitab.store`) instead of localhost, you need to update the Supabase project settings in your Supabase dashboard.

### Steps to Configure:

1. **Go to your Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Update Site URL**
   - Navigate to `Settings` → `General`
   - Update **Site URL** to: `https://hisabkitab.store`

3. **Update Redirect URLs**
   - Navigate to `Authentication` → `URL Configuration`
   - Update **Site URL** to: `https://hisabkitab.store`
   - Add **Redirect URLs**:
     - `https://hisabkitab.store/auth/callback`
     - `https://hisabkitab.store/dashboard`
     - `https://hisabkitab.store/**` (for any other auth redirects)

4. **Update Auth Email Templates (Optional)**
   - Navigate to `Authentication` → `Email Templates`
   - In the **Confirm signup** template, ensure the confirmation link uses the correct domain
   - The template should contain: `{{ .ConfirmationURL }}`

### Environment Variables

Make sure your production environment (Vercel) has these variables set:

```bash
NEXT_PUBLIC_SITE_URL=https://hisabkitab.store
NEXTAUTH_URL=https://hisabkitab.store
```

### Code Changes Made

The following files have been updated to use the production domain:

1. **`lib/auth.ts`** - Updated signup function to use correct redirect URL
2. **`lib/supabase.ts`** - Updated Supabase client configuration
3. **`app/auth/signup/page.tsx`** - Updated signup form to use production redirect
4. **`app/auth/callback/route.ts`** - Updated callback handler for production redirects

### Testing

After making these changes:

1. Deploy the updated code to Vercel
2. Test the signup flow with a new email address
3. Check that the verification email contains links to `hisabkitab.store` instead of localhost
4. Verify that clicking the email link redirects to your production site

### Domain Configuration

Make sure your domain `hisabkitab.store` is properly configured:

1. **Vercel Domain Settings**
   - Add `hisabkitab.store` as a custom domain in your Vercel project
   - Configure DNS settings as per Vercel's instructions

2. **SSL Certificate**
   - Ensure SSL certificate is properly configured for HTTPS

### Troubleshooting

If you still see localhost URLs in emails:

1. Double-check Supabase dashboard settings
2. Clear your browser cache
3. Wait a few minutes for Supabase settings to propagate
4. Try with a fresh email address that hasn't been used before

### Contact

If you need help with Supabase configuration, refer to:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase URL Configuration](https://supabase.com/docs/guides/auth/redirect-urls)
