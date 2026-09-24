"""
CampusEats API — teaching backend for the Ionic + Angular build activity.

Run it:
    pip install "fastapi[standard]" uvicorn
    uvicorn main:app --reload --port 8000

Then open http://localhost:8000/docs for interactive documentation.

Design notes for instructors
----------------------------
* Everything lives in memory. Restarting the server resets the data, which is
  exactly what you want in a classroom.
* CORS is wide open so `ionic serve` (http://localhost:8100) can call it.
* Every endpoint accepts ?delay= and ?fail= so students can *see* loading
  states, skeletons, retries and error toasts without unplugging the wifi.
"""

from __future__ import annotations

import asyncio
import os
import itertools
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# --------------------------------------------------------------------------
# App setup
# --------------------------------------------------------------------------

app = FastAPI(
    title="CampusEats API",
    version="1.0.0",
    description=(
        "A small, dependency-free food-ordering API used by the Ionic + Angular "
        "course project. Every endpoint supports `?delay=` and `?fail=` so you can "
        "demonstrate loading and error states on demand."
    ),
    contact={"name": "CampusEats teaching API"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # dev only — never ship this
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dish photos live next to this file, so the menu works offline in a classroom.
# Sources and licences: static/dishes/CREDITS.md
STATIC_DIR = Path(__file__).parent / "static"
PUBLIC_URL = os.environ.get("PUBLIC_URL", "http://localhost:8000").rstrip("/")   # set on Render
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# --------------------------------------------------------------------------
# Schemas  (these mirror the TypeScript interfaces students write)
# --------------------------------------------------------------------------

Category = Literal["rice", "noodles", "snacks", "drinks", "desserts"]
OrderStatus = Literal["pending", "preparing", "ready", "delivered", "cancelled"]


class MenuItem(BaseModel):
    id: int = Field(examples=[1])
    name: str = Field(examples=["Chicken Adobo Rice Bowl"])
    description: str
    price: float = Field(description="Price in PHP", examples=[89.0])
    category: Category
    available: bool = True
    prepMinutes: int = Field(description="Typical preparation time", examples=[12])
    rating: float = Field(ge=0, le=5, examples=[4.6])
    emoji: str = Field(description="Cheap stand-in for an image", examples=["🍚"])
    image: str = Field(description="Absolute URL to a photo")


class OrderLine(BaseModel):
    itemId: int
    quantity: int = Field(gt=0, le=50, examples=[2])


class OrderCreate(BaseModel):
    customerName: str = Field(min_length=1, max_length=60, examples=["Ana Cruz"])
    roomOrStall: str = Field(min_length=1, max_length=60, examples=["IT Building 204"])
    notes: str = ""
    lines: list[OrderLine] = Field(min_length=1)


class OrderLineOut(OrderLine):
    name: str
    unitPrice: float
    subtotal: float


class Order(BaseModel):
    id: str
    reference: str = Field(examples=["CE-1042"])
    customerName: str
    roomOrStall: str
    notes: str
    lines: list[OrderLineOut]
    total: float
    status: OrderStatus
    placedAt: str = Field(description="ISO-8601 UTC timestamp")


class LoginRequest(BaseModel):
    email: str = Field(examples=["student@campus.edu"])
    password: str = Field(examples=["ionic123"])


class User(BaseModel):
    id: int
    name: str
    email: str
    role: Literal["student", "staff"]


class LoginResponse(BaseModel):
    token: str
    user: User


class ApiError(BaseModel):
    detail: str


# --------------------------------------------------------------------------
# Seed data
# --------------------------------------------------------------------------

def _photo(slug: str) -> str:
    """A real photo of the dish, served by this API from static/dishes/."""
    return f"{PUBLIC_URL}/static/dishes/{slug}.jpg"


SEED_MENU: list[MenuItem] = [
    MenuItem(id=1, name="Chicken Adobo Rice Bowl", description="Slow-braised chicken adobo over garlic rice.",
             price=89.0, category="rice", prepMinutes=12, rating=4.7, emoji="🍚", image=_photo("adobo")),
    MenuItem(id=2, name="Pork Sisig Rice Bowl", description="Sizzling pork sisig with egg and calamansi.",
             price=99.0, category="rice", prepMinutes=14, rating=4.8, emoji="🍛", image=_photo("sisig")),
    MenuItem(id=3, name="Beef Tapa Silog", description="Cured beef tapa, garlic rice and a fried egg.",
             price=105.0, category="rice", prepMinutes=15, rating=4.5, emoji="🥩", image=_photo("tapsilog")),
    MenuItem(id=4, name="Pancit Canton", description="Stir-fried noodles with vegetables and shrimp.",
             price=75.0, category="noodles", prepMinutes=10, rating=4.3, emoji="🍜", image=_photo("pancit")),
    MenuItem(id=5, name="Beef Mami", description="Hot noodle soup with slow-cooked beef.",
             price=85.0, category="noodles", prepMinutes=11, rating=4.4, emoji="🍲", image=_photo("mami")),
    MenuItem(id=6, name="Spaghetti Filipino Style", description="Sweet-style spaghetti with hotdog slices.",
             price=70.0, category="noodles", available=False, prepMinutes=9, rating=4.1, emoji="🍝", image=_photo("spag")),
    MenuItem(id=7, name="Cheese Sticks (6 pcs)", description="Crispy rolls with a molten cheese centre.",
             price=45.0, category="snacks", prepMinutes=6, rating=4.6, emoji="🧀", image=_photo("cheesesticks")),
    MenuItem(id=8, name="Fishball Skewer", description="Street-style fishballs with sweet-spicy sauce.",
             price=30.0, category="snacks", prepMinutes=5, rating=4.2, emoji="🍢", image=_photo("fishball")),
    MenuItem(id=9, name="Turon (2 pcs)", description="Caramelised banana spring rolls.",
             price=35.0, category="snacks", prepMinutes=7, rating=4.5, emoji="🍌", image=_photo("turon")),
    MenuItem(id=10, name="Iced Sweet Tea", description="House-brewed tea over ice.",
             price=40.0, category="drinks", prepMinutes=3, rating=4.0, emoji="🧋", image=_photo("icedtea")),
    MenuItem(id=11, name="Calamansi Juice", description="Fresh calamansi, lightly sweetened.",
             price=35.0, category="drinks", prepMinutes=3, rating=4.4, emoji="🍋", image=_photo("calamansi")),
    MenuItem(id=12, name="Iced Barako Coffee", description="Strong Batangas barako over milk and ice.",
             price=60.0, category="drinks", prepMinutes=4, rating=4.7, emoji="☕", image=_photo("barako")),
    MenuItem(id=13, name="Halo-Halo", description="Shaved ice, beans, leche flan and ube.",
             price=95.0, category="desserts", prepMinutes=8, rating=4.9, emoji="🍧", image=_photo("halohalo")),
    MenuItem(id=14, name="Leche Flan Slice", description="Classic steamed caramel custard.",
             price=55.0, category="desserts", prepMinutes=4, rating=4.6, emoji="🍮", image=_photo("flan")),
    MenuItem(id=15, name="Ube Cheesecake", description="No-bake ube cheesecake with graham crust.",
             price=85.0, category="desserts", prepMinutes=5, rating=4.8, emoji="🍰", image=_photo("ube")),
]

USERS = [
    {"id": 1, "name": "Ana Cruz", "email": "student@campus.edu", "password": "ionic123", "role": "student"},
    {"id": 2, "name": "Mr. Dela Peña", "email": "staff@campus.edu", "password": "ionic123", "role": "staff"},
]

MENU: list[MenuItem] = []
ORDERS: dict[str, Order] = {}
_reference_counter = itertools.count(1042)


def reset_state() -> None:
    global MENU, ORDERS, _reference_counter
    MENU = [item.model_copy(deep=True) for item in SEED_MENU]
    ORDERS = {}
    _reference_counter = itertools.count(1042)


reset_state()


# --------------------------------------------------------------------------
# Shared query parameters: ?delay= and ?fail=
# --------------------------------------------------------------------------

async def simulate(
    delay: Annotated[int, Query(ge=0, le=10000, description="Artificial delay in milliseconds.")] = 0,
    fail: Annotated[bool, Query(description="Force a 500 response, for testing error states.")] = False,
) -> None:
    if delay:
        await asyncio.sleep(delay / 1000)
    if fail:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Simulated server failure. Show your error state and a retry button.",
        )


Simulated = Annotated[None, Depends(simulate)]


def require_token(authorization: Annotated[str | None, Header()] = None) -> User:
    """Deliberately naive auth — good enough to demonstrate a route guard."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token.")
    token = authorization.removeprefix("Bearer ").strip()
    for record in USERS:
        if token == f"demo-token-{record['id']}":
            return User(**{k: record[k] for k in ("id", "name", "email", "role")})
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token.")


# --------------------------------------------------------------------------
# Health
# --------------------------------------------------------------------------

@app.get("/health", tags=["system"], summary="Is the server awake?")
async def health() -> dict[str, str]:
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@app.post("/api/dev/reset", tags=["system"], summary="Reset menu and orders to the seed data")
async def dev_reset() -> dict[str, str]:
    reset_state()
    return {"status": "reset"}


# --------------------------------------------------------------------------
# Menu
# --------------------------------------------------------------------------

@app.get("/api/categories", tags=["menu"], summary="List the menu categories")
async def list_categories(_: Simulated) -> list[str]:
    return ["rice", "noodles", "snacks", "drinks", "desserts"]


@app.get("/api/menu", tags=["menu"], summary="List menu items")
async def list_menu(
    _: Simulated,
    category: Annotated[Category | None, Query(description="Filter to one category.")] = None,
    search: Annotated[str | None, Query(description="Case-insensitive name/description match.")] = None,
    availableOnly: Annotated[bool, Query(description="Hide sold-out items.")] = False,
) -> list[MenuItem]:
    results = MENU
    if category:
        results = [i for i in results if i.category == category]
    if search:
        needle = search.lower()
        results = [i for i in results if needle in i.name.lower() or needle in i.description.lower()]
    if availableOnly:
        results = [i for i in results if i.available]
    return results


@app.get(
    "/api/menu/{item_id}",
    tags=["menu"],
    summary="Get one menu item",
    responses={404: {"model": ApiError, "description": "No item with that id"}},
)
async def get_menu_item(item_id: int, _: Simulated) -> MenuItem:
    for item in MENU:
        if item.id == item_id:
            return item
    raise HTTPException(status.HTTP_404_NOT_FOUND, f"No menu item with id {item_id}.")


# --------------------------------------------------------------------------
# Orders
# --------------------------------------------------------------------------

@app.get("/api/orders", tags=["orders"], summary="List placed orders (newest first)")
async def list_orders(
    _: Simulated,
    orderStatus: Annotated[OrderStatus | None, Query(description="Filter by status.")] = None,
) -> list[Order]:
    orders = sorted(ORDERS.values(), key=lambda o: o.placedAt, reverse=True)
    if orderStatus:
        orders = [o for o in orders if o.status == orderStatus]
    return orders


@app.get(
    "/api/orders/{order_id}",
    tags=["orders"],
    summary="Get one order",
    responses={404: {"model": ApiError, "description": "No order with that id"}},
)
async def get_order(order_id: str, _: Simulated) -> Order:
    order = ORDERS.get(order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No order with id {order_id}.")
    return order


@app.post(
    "/api/orders",
    tags=["orders"],
    status_code=status.HTTP_201_CREATED,
    summary="Place an order",
    responses={400: {"model": ApiError, "description": "Unknown or unavailable item"}},
)
async def create_order(payload: OrderCreate, _: Simulated) -> Order:
    by_id = {item.id: item for item in MENU}
    lines: list[OrderLineOut] = []

    for line in payload.lines:
        item = by_id.get(line.itemId)
        if not item:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown menu item {line.itemId}.")
        if not item.available:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"'{item.name}' is sold out.")
        lines.append(
            OrderLineOut(
                itemId=item.id,
                quantity=line.quantity,
                name=item.name,
                unitPrice=item.price,
                subtotal=round(item.price * line.quantity, 2),
            )
        )

    order = Order(
        id=str(uuid.uuid4()),
        reference=f"CE-{next(_reference_counter)}",
        customerName=payload.customerName,
        roomOrStall=payload.roomOrStall,
        notes=payload.notes,
        lines=lines,
        total=round(sum(l.subtotal for l in lines), 2),
        status="pending",
        placedAt=datetime.now(timezone.utc).isoformat(),
    )
    ORDERS[order.id] = order
    return order


class StatusPatch(BaseModel):
    status: OrderStatus


@app.patch(
    "/api/orders/{order_id}",
    tags=["orders"],
    summary="Update an order's status",
    responses={404: {"model": ApiError, "description": "No order with that id"}},
)
async def update_order(order_id: str, patch: StatusPatch, _: Simulated) -> Order:
    order = ORDERS.get(order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No order with id {order_id}.")
    order.status = patch.status
    return order


@app.delete(
    "/api/orders/{order_id}",
    tags=["orders"],
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel and remove an order",
    responses={404: {"model": ApiError, "description": "No order with that id"}},
)
async def delete_order(order_id: str, _: Simulated) -> None:
    if order_id not in ORDERS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No order with id {order_id}.")
    del ORDERS[order_id]


# --------------------------------------------------------------------------
# Auth  (used by the route guard in Part 2)
# --------------------------------------------------------------------------

@app.post(
    "/api/auth/login",
    tags=["auth"],
    summary="Exchange an email and password for a token",
    responses={401: {"model": ApiError, "description": "Wrong email or password"}},
)
async def login(payload: LoginRequest, _: Simulated) -> LoginResponse:
    for record in USERS:
        if record["email"] == payload.email and record["password"] == payload.password:
            user = User(**{k: record[k] for k in ("id", "name", "email", "role")})
            return LoginResponse(token=f"demo-token-{record['id']}", user=user)
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password.")


@app.get(
    "/api/auth/me",
    tags=["auth"],
    summary="Who is this token?",
    responses={401: {"model": ApiError, "description": "Missing or invalid token"}},
)
async def me(user: Annotated[User, Depends(require_token)]) -> User:
    return user
