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
  imports: string,
  env: any
) => `${imports}

const app = express();
app.use(express.json());
app.use(cors());

let ctx = {
  db: {},
  env: ${env}
}

let tables = ${tables}


const db = new knex({
  useNullAsDefault: true,
  client: "%%database_client%%",
  connection: ctx.env.DATABASE_URL,
});

const existingTables = {};
async function createTableIfNotExists(table) {
  if (existingTables[table.name]) return;

  const hasExists = await db.schema.hasTable(table.name);
  if (!hasExists) {
    await db.schema.createTable(table.name, (builder) => {
      for (let item of table.schema) {
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
  existingTables[table.name] = true;
}

function createDB(table) {
  return {
    async insert(data) {
      await createTableIfNotExists(table);
      const id = crypto.randomUUID();
      await db(table.name).insert({
        ...data,
        id,
      });

      return { ...data, id };
    },
    async remove(id) {
      await createTableIfNotExists(table);
      await db(table.name).delete().where({ id });

      return true;
    },
    async update(id, data) {
      await createTableIfNotExists(table);
      await db(table.name).update(data).where({ id });

      return { ...data, id };
    },
    async get(id) {
      await createTableIfNotExists(table);
      const result = await db(table.name).select("*").where({ id }).first();

      if (!result) return null;

      return result;
    },
    async filter({ perPage, page, sort, filters } = {}) {
      await createTableIfNotExists(table);
      perPage = perPage || 10;
      page = page || 1;

      if (page < 1) page = 1;
      var offset = (page - 1) * perPage;

      function applyFilter(q) {
        if (!filters) return q;
        for (const filter of filters) {
          const value = filter.value;
          if (filter.type === "like") {
            q = q.whereLike(filter.column, "%" + value + "%");
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

      const countQuery = db(table.name).count("* as count").first();

      let dataQuery = db(table.name).select("*");

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


function init() {
  tables.map((table) => {
    ctx.db[table.name] = createDB(table);
  });
}


${functions}

init();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("server started at port " + port + "!");
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

  if (options.database_uri) options.env["DATABASE_URI"] = options.database_uri;

  const envStr = JSON.stringify(options.env);

  const importsStr = getImports(options.packages);

  let code = getCode(collectionsStr, functionsStr, importsStr, envStr);

  code = code.replace(
    "%%database_client%%",
    options.database_client ?? "sqlite3"
  );

  return code;
}
