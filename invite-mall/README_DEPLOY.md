# Deploy Guide (Minimal)

## Requirements
- Node.js 18+
- npm

## Environment
Copy `.env.example` and adjust values:
```
PORT=3000
ADMIN_KEY=your-admin-key
JWT_SECRET=your-jwt-secret
SCHED_ENABLED=1
```

## Dev (API)
```
npm install
npm run dev
```

## Admin (frontend)
```
cd ../invite-mall-admin
npm install
npm run dev
```

## Seed / Verify
```
cd ../invite-mall
npm run verify
npm run verify:serve
```

## E2E (admin)
```
cd ../invite-mall-admin
npm run e2e:admin
```

## Prod (API)
```
./scripts/start-prod.sh
```

## Ports
- Backend: 3000
- Admin: 5173
