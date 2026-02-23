# Persistence Plan (Minimal)

This project currently uses memory store only. Below is a minimal persistence plan for production readiness.

## 1) Storage Choice
- **SQLite (fastest to ship)**: single file, zero ops, good for small-scale.
- **Postgres (standard)**: scalable, better ops tooling, production-grade.

## 2) Tables (Draft)
- `users`
  - `user_id` (PK), `user_name`, `phone`, `created_at`
- `orders`
  - `order_id` (PK), `user_id` (idx), `amount`, `pay_amount`, `status`, `created_at`, `paid_at`, `shipped_at`, `received_at`, `closed_at`, `close_reason`, `address_hash`, `sku_id`, `qty`, `reservation_key`
- `tasks`
  - `task_id` (PK), `task_no` (unique), `user_id` (idx), `order_id` (idx), `status`, `required_helpers`, `qualified_at`, `payout_at`, `risk_level`, `created_at`
- `helps`
  - `help_id` (PK), `task_id` (idx), `helper_user_id` (idx), `order_id` (idx), `status`, `helper_status`, `created_at`, `received_at`
- `products`
  - `id` (PK), `title`, `price`, `status`, `created_at`
- `skus`
  - `id` (PK), `product_id` (idx), `sku_name`, `price`, `stock`, `status`, `created_at`
- `payout_ledger`
  - `id` (PK), `task_id` (unique), `task_no`, `user_id`, `order_id`, `helper_user_ids`, `helper_order_ids`, `qualified_at`, `payout_at`, `payout_status`, `risk_level`, `risk_reasons`, `note`, `operator`, `created_at`, `updated_at`
- `audit_logs`
  - `id` (PK), `at`, `admin_key_masked`, `ip`, `key`, `from`, `to`
- `idempotency_keys`
  - `key` (PK), `order_id`, `user_id`, `sku_id`, `qty`, `amount`, `created_at`

## 3) Index Suggestions
- `users(user_name)`
- `orders(user_id)`, `orders(status)`, `orders(created_at)`
- `tasks(task_no)`, `tasks(user_id)`, `tasks(status)`
- `helps(task_id)`, `helps(helper_user_id)`, `helps(order_id)`
- `skus(product_id)`
- `payout_ledger(task_id)`, `payout_ledger(payout_status)`
- `idempotency_keys(key)`

## 4) Migration Strategy
- **Phase 1 (dual-write)**: write to memory + DB, read from memory.
- **Phase 2 (shadow-read)**: read from DB in background, compare with memory.
- **Phase 3 (switch)**: read/write DB, memory only as cache.
- **Fallback**: export memory to JSON and import to DB if needed.

## 5) Job Recovery Strategy
- All jobs should re-scan by state:
  - expired orders: `status=CREATED` and `created_at` older than threshold
  - payout tasks: `status=QUALIFIED` and `payout_at <= now`
  - auto receive: `status=SHIPPED` and `shipped_at` older than threshold
- Jobs must be idempotent; run safe on restart.
