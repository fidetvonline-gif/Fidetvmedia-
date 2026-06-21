# FideTV Troubleshooting & Restoration Guide

If you are experiencing issues with YouTube playback or the Admin Panel, follow these steps.

## 1. YouTube Playback (Error 153)
**Fix Implemented:** The YouTube video player has been updated to use `www.youtube-nocookie.com` and properly handle the `origin` handshake.

**Further Actions:**
- Ensure the domain `fidetv.online` is correctly allowed in your YouTube Google Cloud Console if using specialized API features.
- If the error persists, it may be due to "Third-party cookies" being blocked in the browser. Using the newly updated "nocookie" embed should bypass most of these restrictions.

## 2. Admin Panel Broken/Non-functional
**Fix Implemented:** 
- The data fetching logic now uses `Promise.allSettled` and `try-finally` blocks. This ensures that if one database table is missing (like `ad_units`), the rest of the dashboard still loads.
- A **Database Infrastructure Warning** banner will now appear in the Admin Panel listing exactly which tables are missing.

**Action Required:**
- If the warning banner appears, go to the **Site Setup** tab in the Admin Panel.
- Copy the provided SQL code and run it in your **Supabase SQL Editor**.
- This will create the missing tables (`site_visits`, `ad_units`, etc.) and set up necessary columns.

## 3. HTTPS and Security
**Fix Implemented:** 
- Standard security headers (HSTS, CSP, X-Frame-Options) have been added to the backend `server.ts`.
- CSP now explicitly allows YouTube embeds and Google Fonts.

## 4. Environment Variables
Ensure the following are set in your hosting environment (Cloud Run / Vercel):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Required for admin functions)
- `YOUTUBE_API_KEY`

---
*Created by FideTV AI Restoration Agent*
