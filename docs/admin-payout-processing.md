# Admin Payout Processing

Provider finance now supports provider-requested payout batches.

TODO(aya): build an admin dashboard screen to:

- list `provider_payout_requests` with status `processing`
- display the snapshot payout destination saved on the request
- compare requested amount against completed booking payout ledger
- mark requests as `paid` with an admin note
- export a payment batch for bank/PayShap processing

Temporary admin workflow:

```bash
node scripts/admin-provider-payouts.mjs
node scripts/admin-provider-payouts.mjs --mark-paid <request_id> --note "Paid via EFT"
```

The script uses `.env.local` and the Supabase service-role key.
