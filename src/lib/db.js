import { DATABASE_FILE } from "$env/static/private";
import knex from "knex";

const db = knex({
  useNullAsDefault: true,
  client: "sqlite3",
  connection: DATABASE_FILE,
});

export default db;
