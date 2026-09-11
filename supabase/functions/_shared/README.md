# Shared Edge Function helpers (reference only)

These files are the **canonical source** when editing shared logic. Each Edge Function folder also has its own local copy so deploy works from the Supabase Dashboard (which only bundles files inside one function folder).

When you change logic here, copy the same change into every function folder that uses it:

| Shared file | Copied into |
|-------------|-------------|
| `push-events.ts` | `send-push/`, `save-reviewed-result/`, `sign-off-intervention/` |
| `send-push-core.ts` | `send-push/`, `save-reviewed-result/`, `sign-off-intervention/` |
| `create-lab-orders.ts` | `create-lab-order/`, `stripe-webhook/` |

**Do not** import `../_shared/` from `index.ts` — that path fails on Dashboard deploy.

**Preferred deploy:** from project root:

```powershell
cd C:\Users\91878\LifeMate
npx supabase functions deploy send-push
```
