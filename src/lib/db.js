import { DATABASE_URI } from "$env/static/private";
import knex from "knex";


const db = knex({
  useNullAsDefault: true,
  client: "mysql",
  connection: DATABASE_URI,
});

export default db;
