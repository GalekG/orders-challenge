# E-Commerce API

A REST API for managing users, products, and orders.

## Requirements

- Node.js >= 20
- pnpm
- Docker & Docker Compose

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create a `.env` file

Create a `.env` file in the root directory using the `.env.sample` file as a template.

```bash
cp .env.sample .env
```

### 3. Start the database

```bash
docker-compose up -d
```

### 4. Run the application

```bash
pnpm run start:dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users | Get all users |
| GET | /users/:id | Get a user by ID |
| POST | /users | Create a new user |
| DELETE | /users/:id | Delete a user |

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /products | Get all products |
| GET | /products/available | Get available products |
| GET | /products/:id | Get a product by ID |
| POST | /products | Create a new product |
| DELETE | /products/:id | Delete a product |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /orders | Get all orders |
| GET | /orders?userId=X | Get orders by user |
| GET | /orders/:id | Get an order by ID |
| POST | /orders | Create a new order |
| PATCH | /orders/:id/status | Update order status |
| POST | /orders/:id/cancel | Cancel an order |

## Data Models

### User

| Field | Type | Description |
|-------|------|-------------|
| id | number | Auto-generated ID |
| email | string | User email (unique, required) |
| name | string | User name (required) |
| isActive | boolean | Active status |
| createdAt | date | Creation timestamp |

### Product

| Field | Type | Description |
|-------|------|-------------|
| id | number | Auto-generated ID |
| name | string | Product name (required) |
| description | string | Product description (optional) |
| price | number | Product price (required) |
| stock | number | Available stock (required) |
| isAvailable | boolean | Availability status |
| createdAt | date | Creation timestamp |
| updatedAt | date | Last update timestamp |

### Order

| Field | Type | Description |
|-------|------|-------------|
| id | number | Auto-generated ID |
| userId | number | Reference to user (required) |
| status | string | Order status |
| total | number | Order total |
| items | array | Order items |
| createdAt | date | Creation timestamp |

### Order Status Values

`pending`, `confirmed`, `shipped`, `delivered`, `cancelled`
