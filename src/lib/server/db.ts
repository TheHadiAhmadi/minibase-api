import knex from "knex";


const db = knex({
  useNullAsDefault: true,
  client: "sqlite",
  connection: "./minibase.db",
  debug: true,
});

export default db;
