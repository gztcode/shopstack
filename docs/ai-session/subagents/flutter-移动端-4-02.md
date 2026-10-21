# 子 Agent · 你负责 ShopStack 项目的 **order 域（backend/internal/order/）** 与 **logistics 域

> 第 2 / 2 卷

## 🤖 MiniMax-M3.1-Flash · 2026-10-20 14:30:57

All 19 RPCs are implemented and validated. Final report:

## Result

All 19 new gRPC RPCs are implemented in `backend/internal/order/` and `backend/internal/logistics/`. The proto files and `gen/` were **not** touched, and no file outside my two directories was modified.

⚠️ **Important:** the proto differs from the task briefing in several places. I implemented **the proto as the contract** (as instructed). Key deviations from the briefing:
- `AdminOrderStatsBy*` return `AdminOrderStatsByChannelResponse` / `…ByHourResponse` / `…ByRegionResponse` (not `AdminOrderStatsResponse`).
- `CalculateFreight` returns `CalculateFreightResponse`; there is **no weight/first_weight/additional_weight in the request or in `delivery_ranges`** — freight is computed from `freight_cents` + `free_freight_amount_cents` + `quantity`.
- `DeliveryRange` is `{template_id, template_name, regions, freight_cents, free_freight_amount_cents, enabled}` (not company/province/weight).
- `AfterSale` uses `admin_remark`/`refund_id`/`item_ids`; `RefundReason` has no `code`/`description`; `LogisticsCompany` has no `website`/`description`.
- Real table columns (checked via `DESC`) differ from the briefing (e.g. `after_sales` has no `reason_id`/`images`/`reviewed_by`/`reviewed_at`; `refund_reasons` has no `code`/`description`; `delivery_ranges` has no weight columns). **No table has a `deleted_at` column, so no `gorm.DeletedAt` soft delete was used** — deletes are hard deletes.

## 1–2. RPCs implemented (key logic)

**order (11)**
| RPC | Logic |
|---|---|
| `ListAfterSales` | Scoped to the **ctx** user (`auth.UserIDFromContext`); a mismatched `req.user_id` → `Forbidden`; anonymous → `Unauthorized`; paged by `created_at/id DESC`. |
| `GetAfterSale` | Loads by id, rejects with `Forbidden` unless it belongs to the ctx user. |
| `ListRefundReasons` | Enabled reasons ordered by `sort, id`, optional `type` filter. |
| `AdminListAfterSales` | Admin view: status/type filters + keyword over `after_sale_no/order_no/user_nickname/reason`, paged with `meta`. |
| `SetAfterSaleStatus` | State machine 0→1/2, 1→3, 3→4 (2 and 4 terminal); invalid transitions → `CodeOrderStatusInvalid`; same-status = idempotent; writes `admin_remark`/`processed_at`; syncs the order (approved→退款中, refunded→已退款 + `refunded_cents` accumulate, capped at `payable_cents`) and writes `order_status_logs`. |
| `AdminListOrders` | Filters: keyword (order_no/receiver/phone), status, payment method (int32 → `pay_channels.code`), user_id, start/end time; sorted `created_at DESC, id DESC`; returns `meta` + global status counts. |
| `AdminOrderStatsByChannel` | `GROUP BY` payment channel via `LEFT JOIN pay_channels`; order count + `SUM(payable_cents)`. |
| `AdminOrderStatsByHour` | `GROUP BY HOUR(created_at)`. |
| `AdminOrderStatsByRegion` | `GROUP BY` province = first space-separated token of `orders.address` (`未知` when empty). |
| `AdminListOrderLogs` | With `order_id` → that order's logs; without →200 most recent logs (request has no page field). |
| `SaveRefundReason` | Create/update with name+type uniqueness check (`Conflict`), type clamped to 1–3. |

**logistics (8)**
| RPC | Logic |
|---|---|
| `ListLogisticsCompanies` | Paged list (all companies, `sort,id` order) with keyword over name/code + `meta`. |
| `CalculateFreight` | Template (explicit, else first enabled, else default 1000/9900 rule) → delivery-range match by region (delivery range beats template) → `freight = base × quantity` → free when `amount ≥ threshold` or base = 0; returns `remark` describing the applied rule. |
| `ListDeliveryRanges` | Paged ranges with joined template name + `meta`. |
| `GetShipmentByTrackingNo` | Lookup by tracking_no → `CodeShipmentNotFound` when absent. |
| `SaveLogisticsCompany` | Create/update, name+code required, code uniqueness → `Conflict`. |
| `DeleteLogisticsCompany` | Refuses with `Conflict` if `shipments` reference the company (by code or name), otherwise deletes. |
| `SaveDeliveryRange` | Create/update; template must exist, regions required, non-negative amounts. |
| `ListReturnShipments` | Shipments whose order has a 退货/换货 after-sale **or** whose remark contains 退货/退件/退回; paged with `meta`. |

## 3. Files

New: `backend/internal/order/after_sale.go`, `backend/internal/order/stats.go`, `backend/internal/logistics/company.go`, `backend/internal/logistics/range.go`, `backend/internal/logistics/freight.go`, `backend/internal/logistics/shipment.go`
Modified: `backend/internal/order/handler.go`, `backend/internal/logistics/handler.go`

## 4. Self-check output (actual)

```
### go build   → (no output = success)
### go vet     → (no output = success)
### gofmt -l   → (no output = success)
```
Also `go build ./backend/cmd/order-service/ ./backend/cmd/logistics-service/` → exit 0, confirming the handlers satisfy the full gRPC server interfaces (compile-time assertions added).

**Runtime validation** (temporary in-package tests against the live `shopstack-mysql-test` DB, then deleted; seed data restored to its original state): after-sale ownership/状态机/idempotency, refund-reason CRUD, admin order list + all three stats (channel=微信支付 5 单/89000 分；hour=12；region=浙江省), freight quotes (华东 1000、华北 1500、港澳台 3000、多件 ×3、免邮 9900、模板 3 新疆 2000、模板/编码/参数异常均报错), range list with template names, company save/duplicate/delete-conflict, return-shipment matching. One real bug found and fixed this way: the idempotent same-status path re-applied the refund amount to the order.

## 5. Statistics caliber (identical for all three)

Window = last `days` days (default 30) by `orders.created_at`. **Order count = `COUNT(*)` of orders created in the window; amount = `SUM(payable_cents)` (应付金额, 分)** — unpaid orders are included in both. "Channel" = the order's `payment_method` joined to `pay_channels` (channel number + channel name; unmatched payment methods group as channel 0 / raw method name). Hour = `HOUR(created_at)` (0–23, ascending). Region = first space-separated segment of `orders.address` (province), `未知` if empty, ordered by amount desc.

## 6. Not done / caveats (honest)

- **`GetShipmentByTrackingNo` cannot carry logistics tracks**: the proto `Shipment` message has no track field (tracks live in `ListShipmentTracksResponse`), so only the shipment body is returned. `ListTracks` already serves tracks.
- **Channel/region semantics are my design choice** — the schema has no order-source/region column; the `channels` table is a product-display channel with no order linkage, so `pay_channels` (payment channel) is used as the "channel" dimension.
- **No `weight`-based freight**: `delivery_ranges` has no weight/first-weight columns, so the briefing's `首重/续重` formula is impossible; I used `base × quantity` + free-threshold instead.
- **Status filter limitation**: proto3 `int32 status` cannot distinguish "unset" from `0`, so `status ≤ 0` means "no filter" — filtering by 待审核 (0) is not reachable.
- **`AdminListOrderLogs` cannot paginate** (request message has no page field) — capped at 200 rows.
- **Cross-domain read**: `ListReturnShipments` reads `after_sales` (read-only) from the shared DB to identify return shipments; `shipments` has no return marker column.
- **Not touched (other owners)**: `backend/cmd/*/main.go` AutoMigrate lists do not include the new models (`AfterSale`, `RefundReason`, `LogisticsCompany`, `DeliveryRange`) — the tables already exist, so no runtime issue, but adding them for auto-migration would require editing `cmd/` (outside my scope). `backend/cmd/smoketest/sweep.go` payloads use the old field names (`admin_note`, `code`, `company_id`, `first_weight`, `weight`/`city` on a POST-only freight route) and `backend/httpx` route policies; those need updating by their owners for the sweep to pass.
