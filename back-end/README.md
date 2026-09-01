# Dream Destination Back-End

NestJS in-memory backend for Review 4.

## Run

```bash
npm install
npm run start:dev
```

Swagger UI: `http://localhost:3000/api`

Generated Swagger JSON: `docs/swagger.json`

Every protected endpoint expects the role header:

```http
x-role: Travel Partner
```

Valid role values are `Super User`, `Traveler`, `Travel Partner`, `Tour Guide`, `Vendor`, and `Support Executive`.
