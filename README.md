# vyson-url-shortener

A simple URL shortener built using **Hono** and **Turso**.

## Setup

### Prerequisites

- [Bun](https://bun.sh/)
- [Turso](https://turso.tech/)

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```
2. Install dependencies using Bun:
   ```sh
   bun install
   ```
3. Configure environment variables:

   Create a `.dev.vars` file in the root of your project and use the example provided in `.dev.vars.example` as a reference.

   > **Note:** `TURSO_DB_AUTH_TOKEN` is not required if you are using a local database.

## Running the Application

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

## Run Tests

```sh
bun test
```
