# CampusEats API — Reference

**Companion to the CampusEats build activity (Parts 1 and 2).** This is the backend your Ionic + Angular app talks to. You do not modify it — you consume it.

| You need | Go to |
|---|---|
| Get it running in 3 commands | [Running the server](#running-the-server) |
| The list of endpoints | [Endpoints](#endpoints) |
| TypeScript interfaces to copy | [TypeScript models](#typescript-models) |
| Fake slow networks and failures | [Testing loading and error states](#testing-loading-and-error-states) |

Base URL: `http://localhost:8000`

---

## Running the server

You need Python 3.10 or newer. Check with `python3 --version`.

```bash
cd campuseats-api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

macOS and Linux users can run `./run.sh` instead; Windows users can double-click `run.bat`. Both create a virtual environment and start the server for you.

Confirm it works by opening <http://localhost:8000/docs> in a browser. That page is generated from the code itself, so it is never out of date — you can fire a request at any endpoint from there and see the exact JSON your Angular service will receive.

Leave this terminal running while you develop. Open a second terminal for `ionic serve`.

### Two servers, two ports

| Process | Port | Command |
|---|---|---|
| CampusEats API | 8000 | `uvicorn main:app --reload --port 8000` |
| Ionic app | 8100 | `ionic serve` |

CORS is already open on the API, so the browser will let your app call across ports. If you see a CORS error, the API is almost certainly not running.

### Resetting

All data is held in memory. Restarting the server restores the original 15 menu items and clears every order. To reset without restarting:

```bash
curl -X POST http://localhost:8000/api/dev/reset
```

---

## Endpoints

Every endpoint below accepts the two simulation parameters described in [Testing loading and error states](#testing-loading-and-error-states).

### Menu

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/menu` | All menu items, with optional filters |
| `GET` | `/api/menu/{id}` | One menu item |
| `GET` | `/api/categories` | The five category names |

`GET /api/menu` accepts three optional query parameters:

| Parameter | Type | Effect |
|---|---|---|
| `category` | `rice \| noodles \| snacks \| drinks \| desserts` | Filter to one category |
| `search` | string | Case-insensitive match on name and description |
| `availableOnly` | boolean | Hide sold-out items |

```bash
curl "http://localhost:8000/api/menu?category=drinks"
```

```json
[
  {
    "id": 10,
    "name": "Iced Sweet Tea",
    "description": "House-brewed tea over ice.",
    "price": 40.0,
    "category": "drinks",
    "available": true,
    "prepMinutes": 3,
    "rating": 4.0,
    "emoji": "🧋",
    "image": "https://picsum.photos/seed/icedtea/480/320"
  }
]
```

Requesting an id that does not exist returns `404` with a JSON body:

```json
{ "detail": "No menu item with id 999." }
```

One item — `Spaghetti Filipino Style`, id 6 — is deliberately marked `"available": false`. Use it to build and test your sold-out UI.

### Orders

| Method | Path | Purpose | Success code |
|---|---|---|---|
| `GET` | `/api/orders` | All orders, newest first | 200 |
| `GET` | `/api/orders/{id}` | One order | 200 |
| `POST` | `/api/orders` | Place an order | 201 |
| `PATCH` | `/api/orders/{id}` | Change the status | 200 |
| `DELETE` | `/api/orders/{id}` | Cancel and remove | 204 |

`GET /api/orders` accepts `orderStatus` to filter by `pending`, `preparing`, `ready`, `delivered`, or `cancelled`.

To place an order, send the item ids and quantities. The server looks up the current prices itself, so a client cannot invent a total:

```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Ana Cruz","roomOrStall":"IT Building 204","lines":[{"itemId":1,"quantity":2},{"itemId":10,"quantity":1}]}'
```

```json
{
  "id": "5e0ed2b5-19b2-441e-ad82-a4392069d76e",
  "reference": "CE-1042",
  "customerName": "Ana Cruz",
  "roomOrStall": "IT Building 204",
  "notes": "",
  "lines": [
    { "itemId": 1, "quantity": 2, "name": "Chicken Adobo Rice Bowl", "unitPrice": 89.0, "subtotal": 178.0 },
    { "itemId": 10, "quantity": 1, "name": "Iced Sweet Tea", "unitPrice": 40.0, "subtotal": 40.0 }
  ],
  "total": 218.0,
  "status": "pending",
  "placedAt": "2026-08-26T12:22:19.840189+00:00"
}
```

Ordering a sold-out item returns `400`:

```json
{ "detail": "'Spaghetti Filipino Style' is sold out." }
```

`PATCH` takes only a status: `{"status": "preparing"}`.

### Authentication

You do not need these in Part 1. Part 2 uses them to demonstrate a route guard.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Exchange email and password for a token |
| `GET` | `/api/auth/me` | Identify the current token holder |

Two accounts exist, both with the password `ionic123`:

| Email | Role |
|---|---|
| `student@campus.edu` | student |
| `staff@campus.edu` | staff |

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@campus.edu","password":"ionic123"}'
```

```json
{
  "token": "demo-token-1",
  "user": { "id": 1, "name": "Ana Cruz", "email": "student@campus.edu", "role": "student" }
}
```

Send the token back as a bearer header on `GET /api/auth/me`:

```bash
curl http://localhost:8000/api/auth/me -H "Authorization: Bearer demo-token-1"
```

Wrong credentials return `401` with `{"detail": "Wrong email or password."}`, and a missing header returns `401` with `{"detail": "Missing bearer token."}`.

This authentication is deliberately fake. The token is a predictable string and the passwords sit in plain text in `main.py`. It exists so you can practise guarding a route, not to teach security.

### System

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Confirm the server is awake |
| `POST` | `/api/dev/reset` | Restore seed data |

---

## TypeScript models

Copy these into `src/app/core/models/`. They match the API exactly, field for field.

```typescript
// menu-item.model.ts
export type Category = 'rice' | 'noodles' | 'snacks' | 'drinks' | 'desserts';

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: Category;
  available: boolean;
  prepMinutes: number;
  rating: number;
  emoji: string;
  image: string;
}
```

```typescript
// order.model.ts
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface OrderLine {
  itemId: number;
  quantity: number;
  name: string;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  reference: string;
  customerName: string;
  roomOrStall: string;
  notes: string;
  lines: OrderLine[];
  total: number;
  status: OrderStatus;
  placedAt: string;
}

export interface NewOrder {
  customerName: string;
  roomOrStall: string;
  notes?: string;
  lines: { itemId: number; quantity: number }[];
}
```

Note that `Order.lines` and `NewOrder.lines` are different shapes. You send ids and quantities; the server returns those plus the name, unit price and subtotal it calculated. Modelling both separately is the honest thing to do — one interface with optional fields everywhere would hide which fields you can actually rely on.

---

## Testing loading and error states

Every endpoint accepts two extra query parameters. They exist so you can demonstrate UX behaviour on a fast local network.

| Parameter | Values | Effect |
|---|---|---|
| `delay` | 0–10000 | Wait this many milliseconds before responding |
| `fail` | `true` / `false` | Return `500` with an error message |

```bash
curl "http://localhost:8000/api/menu?delay=2000"
curl "http://localhost:8000/api/menu?fail=true"
```

```json
{ "detail": "Simulated server failure. Show your error state and a retry button." }
```

In Part 2 you will point your service at `?delay=1500` to prove your skeleton screens appear, then at `?fail=true` to prove your error state and retry button work. Set them in one place:

```typescript
// environment.ts — flip these while testing, back to defaults before you submit
export const environment = {
  apiUrl: 'http://localhost:8000/api',
  simulate: '',              // '?delay=1500'  or  '?fail=true'
};
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Failed to fetch` / CORS error in the browser console | API is not running | Start `uvicorn` in a second terminal |
| `Address already in use` | Port 8000 is taken | Run on another port and update `environment.ts` |
| Angular shows `undefined` for every field | Reading the response before it arrives | Guard the template with `@if`, or start the signal at `[]` |
| Order posts but the list does not update | The signal was mutated, not replaced | Replace the array: `this.orders.set([...])` |
| `422 Unprocessable Entity` on `POST /api/orders` | Body shape is wrong | Check `lines` is an array of `{itemId, quantity}` |
| Data disappeared | Server restarted | Expected — the store is in memory |

When a request misbehaves, reproduce it at <http://localhost:8000/docs> first. If it works there, the bug is in your Angular service, not the API.
