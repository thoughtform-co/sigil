# DNS: sigil.thoughtform.co

Use these steps to point the subdomain **sigil.thoughtform.co** to your Vercel deployment.

## 1. Vercel

1. Open your Sigil project in the Vercel dashboard.
2. Go to **Settings** → **Domains**.
3. Click **Add** and enter: `sigil.thoughtform.co`
4. Vercel will show you the required DNS record (usually a CNAME).

## 2. GoDaddy (thoughtform.co)

1. Log in to GoDaddy and open **My Products** → **DNS** for **thoughtform.co**.
2. Add a record:
   - **Type:** CNAME
   - **Name:** `sigil` (subdomain only; the full host will be sigil.thoughtform.co)
   - **Value:** `cname.vercel-dns.com`
   - **TTL:** 600 (or default)
3. Save.

## 3. Wait and verify

- DNS can take a few minutes to propagate.
- In Vercel, the domain will show as **Verified** once the CNAME is detected.
- Vercel will issue an SSL certificate automatically.

## 4. Supabase redirect URL

1. In Supabase Dashboard go to **Authentication** → **URL Configuration**.
2. Add to **Redirect URLs**: `https://sigil.thoughtform.co/auth/callback`
3. Add to **Site URL** (if you want it as primary): `https://sigil.thoughtform.co`

After this, magic link emails will work when users open the link on sigil.thoughtform.co.
