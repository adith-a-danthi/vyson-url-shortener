# vyson-url-shortener

A simple URL shortener built using **Hono** and **Turso**.

## Setup

### Prerequisites

- [Bun](https://bun.sh/)
- [Turso](https://turso.tech/)

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/adith-a-danthi/vyson-url-shortener.git
   cd vyson-url-shortener
   ```
2. Install dependencies using Bun:
   ```sh
   bun install
   ```
3. Configure environment variables:

   Create a `.dev.vars` file in the root of your project and use the example provided in `.dev.vars.example` as a reference.

   > **Note:** `TURSO_DB_AUTH_TOKEN` is not required if you are using a local database.
4. Run the migration script:
   ```sh
   bun run db:migrate
   ```

### Running the Application

1. **If using a local database**, serve the database file using Turso:

   ```sh
   turso dev --db-file ./vyson-url-shortener.db
   ```

   This will start a local server on `http://127.0.0.1:8080`.

   Mention this URL for `TURSO_DB_URL` in the `.dev.vars` file.

2. Run the migration script:

   ```sh
   bun run db:migrate
   ```

3. Start the development server:

   ```sh
   bun run dev
   ```

### Run Tests

```sh
bun test
```

---

## Database Schema

![Database Schema](db_schema.png)

---

## Endpoints

- `GET /`: Ping the application.
- `GET /health`: Check the health of the application.

### Users

- `POST /users`: Create a new user.
- `GET /users?email={email}`: Get a user by email.

### URLs

- `GET /urls`: Get all URLs created by the user.
- `POST /urls/shorten`: Shorten a new URL.
- `POST /urls/shorten/batch`: Shorten multiple URLs. (Requires enterprise tier)
- `GET /urls/redirect?code={code}&pw={password}`: Redirect to a shortened URL with optional password.
- `DELETE /urls/shortcode/{code}`: Delete a shortened URL.
- `PATCH /urls/{id}`: Update a URL.
