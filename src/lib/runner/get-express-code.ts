import type { ProjectCollection, ProjectFunction } from "$lib/types";

let getFunction = (name, code) => `
app.post("/${name}", async (req, res) => {
  let handle;

  ${code}


  const authorizationHeader = req.headers['authorization']
  const token = authorizationHeader ? authorizationHeader.split(' ')[1] : ""

  const result = await handle(req.body, {...ctx, token });
  return res.json(result);
});
`;

let getCode = (
  tables: string,
  functions: string
) => `const express = require("express");
const knex = require("knex");
const crypto = require('crypto');
const jsonwebtoken = require('jsonwebtoken')
const bcrypt = require('bcrypt')
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
        if (item.type === "string") {
          builder.text(item.name);
        } else if (item.type === "number") {
          builder.double(item.name);
        } else if (item.type === "boolean") {
          builder.boolean(item.name);
        } else if (item.type === "uuid") {
          builder.uuid(item.name);
        } else {
          builder.text(item.name);
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
    async filter({ perPage, page, sort, filters } = {}) {
      perPage = perPage || 10;
      page = page || 1;

      if (page < 1) page = 1;
      var offset = (page - 1) * perPage;

      function applyFilter(q) {
        if (!filters) return q;
        for (const filter of filters) {
          const value = filter.value;
          if (filter.type === "like") {
            q = q.whereLike(filter.column, '%' + value + '%');
          } else if (filter.type === "in") {
            q = q.whereIn(filter.column, value);
          } else if (filter.type === "between") {
            q = q.whereBetween(filter.column, value);
          } else {
            q = q.where(filter.column, "=", value);
          }
        }

        return q;
      }

      function applyPagination(q) {
        if (!offset && !perPage) return q;
        return q.offset(offset).limit(perPage);
      }

      function applySort(q) {
        if (!sort) return q;
        return q.orderBy(sort);
      }

      const countQuery = db(collection).count("* as count").first();

      let dataQuery = db(collection).select("*");

      dataQuery = applyFilter(dataQuery);
      dataQuery = applyPagination(dataQuery);
      dataQuery = applySort(dataQuery);
      // .offset(offset).limit(perPage).orderBy(sort)

      return Promise.all([countQuery, dataQuery]).then(([count, data]) => {
        var total = count.count;
        var lastPage = Math.ceil(total / perPage);

        return {
          data,
          perPage,
          page,
          total,
          lastPage,
        };
      });
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
    packages: {
    //    jsonwebtoken: require('jsonwebtoken')
    },
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
