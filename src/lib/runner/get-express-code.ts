import type { ProjectCollection, ProjectFunction } from "$lib/types";

let getFunction = (name, code) => `
app.post("/${name}", async (req, res) => {
  let handle;

  ${code}

  const result = await handle(req.body, ctx);
  return res.json(result);
});
`;

let getCode = (
  tables: string,
  functions: string
) => `const express = require("express");
const knex = require("knex");
const crypto = require('crypto');
const cors = require('cors')

const app = express();
app.use(express.json());
app.use(cors());

let ctx = {}

let tables = ${tables}

// Update client and connection
const db = new knex({
  useNullAsDefault: true,
  client: "sqlite3",
  connection: ":memory:",
  debug: true,
});

async function createDB(collection, schema) {
  const hasExists = await db.schema.hasTable(collection);

  if (!hasExists) {
    await db.schema.createTable(collection, (builder) => {
      for (let item of schema) {
        // TODO: support all available types
        if (item.type === "string") {
          builder.string(item.name);
        }
      }
    });
  }
  return {
    async insert(data) {
      const id = crypto.randomUUID();
      await db(collection).insert({
        ...data,
        id,
      });

      return { ...data, id };
    },
    async remove(id) {
      await db(collection).delete().where({ id });

      return true;
    },
    async update(id, data) {
      await db(collection).update(data).where({ id });

      return { ...data, id };
    },
    async get(id) {
      const result = await db(collection).select("*").where({ id }).first();

      if (!result) return null;

      return result;
    },
    async find(filter = {}, options = {}) {
      let result = await db(collection).select("*").where();
      const take = options.take ?? -1;
      const skip = options.skip ?? 0;

      result = result.filter((data) => {
        let returnVal = true;
        Object.entries(filter).map(([key, value]) => {
          if (data[key] !== value) {
            returnVal = false;
          }
        });
        return returnVal;
      });
      if (take === -1) return result.slice(skip);
      if (take > result.length) return result.slice(skip);

      return result.slice(skip, skip + take);
    },
  };
}

async function init() {
  const db = {}

  for(let table of tables) {
    db[table.name] = await createDB(table.name, table.schema)
  }

  ctx = {
    db,
    env: process.env,
  };
}

${functions}

init().then(() => {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log("server started at port " + port + "!");
  });
});

module.exports = app
`;

export function getExpressCode(
  collections: ProjectCollection[],
  functions: ProjectFunction[]
) {
  const functionsStr = functions
    .map((fn) => getFunction(fn.name, fn.code))
    .join("\n\n");

  const collectionsStr = JSON.stringify(collections);

  return getCode(collectionsStr, functionsStr);
}
