# update-lab-order-status — what this is (plain English)

This Edge Function lets **admin** or **clinic_staff** update a `lab_orders` row (e.g. kit dispatched → sample received).

It is **not SQL**. The SQL fallback is `update_lab_order_status()` in `supabase/phase4-day5-lab-orders.sql`.

## Deploy

```powershell
cd C:\Users\91878\LifeMate
npx supabase functions deploy update-lab-order-status
```

Set `SUPABASE_SERVICE_ROLE_KEY` in Edge Function secrets (same as other functions).

## If not deployed

The admin **Lab orders** edit screen falls back to the Postgres RPC automatically.
