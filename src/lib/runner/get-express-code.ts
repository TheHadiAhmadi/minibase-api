import type { ProjectCollection, ProjectFunction } from "$lib/types";

let getFunction = (method: string, name: string, code: string) => `
app.${method.toLowerCase()}("/${name}", async (req, res) => {
  let handle;

  ${code}


  const authorizationHeader = req.headers['authorization']
  const token = authorizationHeader ? authorizationHeader.split(' ')[1] : ""

  ${method === "GET" ? "let body = req.query" : "let body = req.body"}
  
  const result = await handle(body, {...ctx, token });
  return res.json(result);
});
`;

let getCode = (
  tables: string,
  functions: string,
  imports: string
) => `${imports}

const app = express();
app.use(express.json());
app.use(cors());

let ctx = {
  db: {},
  env: process.env
}

let tables = ${tables}


const db = new knex({
  useNullAsDefault: true,
  client: "%%database_client%%",
  connection: '%%database_uri%%',
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
  await Promise.all(tables.map(async table => {
    ctx.db[table.name] = await createDB(table.name, table.schema)
  }))
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

function getImports(packages: string[]) {
  let str = "";

  for (let pack of packages) {
    str += `const ${pack} = require("${pack}");\n`;
  }

  return str;
}

export function getExpressCode(
  collections: ProjectCollection[],
  functions: ProjectFunction[],
  options: any
) {
  const functionsStr = functions
    .map((fn) => getFunction(fn.method, fn.name, fn.code))
    .join("\n\n");

  const collectionsStr = JSON.stringify(
    collections.map((collection) => ({
      name: collection.name,
      schema: collection.schema,
    })),
    null,
    2
  );

  const importsStr = getImports(options.packages);

  let code = getCode(collectionsStr, functionsStr, importsStr);

  code = code.replace(
    "%%database_client%%",
    options.database_client ?? "sqlite3"
  );
  code = code.replace("%%database_uri%%", options.database_uri ?? ":memory:");

  return code;
}
