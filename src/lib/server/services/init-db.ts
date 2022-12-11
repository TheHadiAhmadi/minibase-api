import db from "$lib/server/db";

export async function initDB() {
  const [
    hasProjectsTable,
    hasFunctionsTable,
    hasCollectionsTable,
    hasKeysTable,
    hasRowsTable,
  ] = await Promise.all([
    db.schema.hasTable("projects"),
    db.schema.hasTable("functions"),
    db.schema.hasTable("collections"),
    db.schema.hasTable("keys"),
    db.schema.hasTable("rows"),
  ]);
  if (!hasProjectsTable)
    await db.schema.createTable("projects", (builder) => {
      builder.string("id").notNullable().primary();
      builder.string("name").notNullable().unique();
      builder.text("env").notNullable().defaultTo("{}");
    });

  if (!hasFunctionsTable)
    await db.schema.createTable("functions", (builder) => {
      builder.string("id").notNullable().primary();
      builder.string("project").notNullable();
      builder.text("routes").notNullable();
      builder.string("method").notNullable().defaultTo("POST");
      builder.string("name").notNullable();
      builder.text("code").notNullable();
    });

  if (!hasCollectionsTable)
    await db.schema.createTable("collections", (builder) => {
      builder.string("id").notNullable().primary();
      builder.string("project").notNullable();
      builder.string("name").notNullable();
      builder.text("schema").notNullable().defaultTo("[]");
    });

  if (!hasRowsTable)
    await db.schema.createTable("rows", (builder) => {
      builder.string("id").notNullable().primary();
      builder.string("project").notNullable();
      builder.string("collection").notNullable();
      builder.text("data").notNullable().defaultTo("{}");
    });

  if (!hasKeysTable)
    await db.schema.createTable("keys", (builder) => {
      builder.string("id").notNullable().primary();
      builder.string("project").notNullable();
      builder.string("name").notNullable();
      builder.string("value").notNullable();
      builder.text("scopes").notNullable();
    });
}
