# Backup &amp; Disaster Recovery

What's backed up, how often, and how to restore.

## 1. What's stored where

| Asset                     | Storage              | Backup mechanism                  |
|---------------------------|----------------------|-----------------------------------|
| Application code          | Git (GitHub)         | Distributed VCS                   |
| Database (PostgreSQL)     | Neon                 | Point-in-time recovery (Neon)     |
| Blob storage (records)    | Vercel Blob          | Vercel-managed; immutable URLs    |
| S3 attachments            | AWS S3               | Versioning ON; cross-region (TODO)|
| Secrets                   | Vercel Env Vars      | 1Password vault (separate file)   |
| Stripe / SafePay events   | Provider dashboards  | Provider-managed                  |
| Audit logs                | DB (`AuditLog`)      | Part of DB PITR                   |

## 2. RPO / RTO targets

| Component | RPO    | RTO    |
|-----------|--------|--------|
| Database  | 5 min  | 30 min |
| Blob/S3   | 24 h   | 4 h    |
| App code  | 0      | 5 min  |
| Secrets   | 0      | 10 min |

(RPO = Recovery Point Objective; RTO = Recovery Time Objective.)

## 3. Database — backups

Neon performs continuous WAL backups. Branches retained per project config.

### Verify backup is current

```sql
SELECT pg_last_wal_replay_lsn();
SELECT now() - pg_last_xact_replay_timestamp() AS lag;
```

### Restore to a point in time

1. Neon Console → project → Branches → Create branch from PITR.
2. Pick the timestamp (must be within retention window).
3. New branch gets its own connection string.
4. Update `DATABASE_URL` in Vercel → redeploy.
5. Old branch can be reattached read-only for forensics.

### Logical backup (cold, monthly)

```bash
pg_dump --format=custom --no-owner $DATABASE_URL > "medintel-$(date +%F).dump"
# Store encrypted in 1Password Documents or S3 Glacier.
```

## 4. Blob storage

Vercel Blob is durably stored on Cloudflare R2. No application-side backup is required for *resilience*; we still:

- Tag every record blob with `records/<patientId>/<ts>-<filename>` so a lost row can be reconciled by listing the prefix.
- Mirror critical buckets (prescriptions) to S3 weekly (TODO: implement script in `scripts/mirror-blob-to-s3.mjs`).

## 5. Restoring after a regional outage

1. Vercel: deployments live in multiple regions; nothing to do.
2. Neon: provision a replica in a different region; failover via DNS swap (Neon Routing).
3. App: redeploy with the failover `DATABASE_URL`.
4. Webhooks: register the failover URL in PSP dashboards (or use a stable proxy domain).

## 6. Periodic restore drills

Every quarter:

- Restore last week's DB into a staging Neon branch.
- Run `npm run db:seed` on a clean schema in another branch.
- Smoke-test login + booking + escrow against the restored DB.
- Document any drift in `docs/post-mortems/`.

## 7. Encryption

- At rest: Neon + Vercel Blob + S3 all encrypted by provider (AES-256).
- In transit: TLS everywhere; non-HTTPS endpoints disabled at the CDN.
- Secrets: never in Git. `.env*` files gitignored.
