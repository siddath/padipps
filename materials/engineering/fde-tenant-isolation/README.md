# Tenant isolation — PostgreSQL execution drill

Continue the [same capstone](../fde-capstone/README.md); tenant-a = Aster, tenant-b = Birch.
This is an **unsolved SQL exercise**, not a working isolation layer. Padipps will not start a database
or execute SQL for you.

In your own copy, implement `schema.sql` for PostgreSQL 16+ in a **new disposable database** whose
name begins `padipps_fde_`. Have your local database administrator create an ordinary NOLOGIN role
`padipps_app`, with neither superuser nor BYPASSRLS, and grant your disposable database owner the
ability to SET ROLE to it. Do not alter roles in a shared database. Capture PostgreSQL version and
role attributes in your evidence. Use a local socket/service or `.pgpass`; never paste credentials
into this material or your learning record.

```sh
psql -X -d padipps_fde_sandbox -v ON_ERROR_STOP=1 -f schema.sql
psql -X -d padipps_fde_sandbox -v ON_ERROR_STOP=1 -f verify.sql
```

The untouched schema **fails with a TODO exception**. A missing database/role is an environment
blocker, not a passing or failing isolation result. Both commands are required for actual proof.
The verification transaction rolls back its own inserted fixtures; your schema changes remain in
the disposable database. Do not run this on an existing customer or study database.

## Implement

Create `public.fde_contacts(tenant_id text, contact_id text, display_name text)` with a composite
primary key. Grant the ordinary app role only the operations it needs. Enable RLS and write the
read and write policies against transaction-local `app.tenant_id`. Missing/empty context must deny
all rows. The app role must not own the table. Apply the tenant after validated membership from
the identity session; a client must never choose the trusted SQL context directly.

Add your own tests beyond `verify.sql`: a cross-tenant join, a background reconciliation job,
foreign keys that include tenant identity, and a cache key reused by two organizations. Explain
why superusers/BYPASSRLS and ordinary table owners differ from application users. If you use
FORCE ROW LEVEL SECURITY, test its actual effect without asserting it constrains superusers.

## Decision artifact

Write `tenancy-decision.md` with this table filled using the fictional customer assumptions:

| Choice | Isolation/blast radius | Onboarding/migrations | Backup/restore | Cost/operations | Switch trigger |
|---|---|---|---|---|---|
| Shared database and tables | TODO | TODO | TODO | TODO | TODO |
| Shared database, schema per tenant | TODO | TODO | TODO | TODO | TODO |
| Database per tenant | TODO | TODO | TODO | TODO | TODO |

Explain one failure caused by a connection pool retaining tenant context. Record the role output,
SQL test output, and one unresolved trade-off in your learning record. A schema review with no
database run stays **database behavior unverified**.
