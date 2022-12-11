const express = require("express");
const knex = require("knex");
const crypto = require('crypto');
const jsonwebtoken = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const cors = require('cors')

const app = express();
app.use(express.json());
app.use(cors());

let ctx = {}

let tables = [{"id":"2716944b-b0f6-4c2a-b531-8e99da1a592e","project":"chat","name":"users","schema":[{"name":"name","type":"string"},{"name":"username","type":"string"},{"name":"email","type":"string"},{"name":"password","type":"string"},{"name":"bio","type":"string"}]},{"id":"90dc078f-728a-4b36-96e9-514ec82268f8","project":"chat","name":"messages","schema":[{"name":"from","type":"string"},{"name":"to","type":"string"},{"name":"message","type":"string"},{"name":"replyTo","type":"string"},{"name":"updatedAt","type":"number"},{"name":"createdAt","type":"string"}]}]

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


app.register("/ function hashPassword(str) {
  if (str) {
    return bcrypt.hashSync(str, 10);
  }
  throw new Error("empty password");
}

handle = async (body, ctx) => {
  try {
    const { name, username, email, password, bio = "Hello World!" } = body;

    if (!name || !username || !email || !password) {
      return {
        error: {
          code: "BAD_INPUT",
          message: "name, email, Username and password are required fields",
        },
      };
    }

    const [usernameUsers, emailUsers] = await Promise.all([
      ctx.db.users.filter({ filters: [{column: 'username', value: username, operator: 'equal'}] }),
      ctx.db.users.filter({ filters: [{column: 'email', value: email, operator: 'equal'}] }),
    ]);

    if (usernameUsers.data.length > 0) {
      return {
        error: {
          code: "CONFLICT",
          message: "Username is already taken",
        },
      };
    }

    if (emailUsers.data.length > 0) {
      return {
        error: {
          code: "CONFLICT",
          message: "Email is already taken",
        },
      };
    }

    const user = {
      name,
      username,
      email,
      bio,
    };

    const result = await ctx.db.users.insert({
      ...user,
      password: hashPassword(password),
    });

    // name, email, username, id, bio
    const token = await jsonwebtoken.sign(
      { ...user, id: result.id },
      "SECRET%"
    );

    return {
      data: {
        token,
        user: {
          ...user,
          id: result.id,
        },
      },
    };
  } catch (err) {
    return {
      body: {
        code: "INTERNAL_ERROR",
        message: err.message,
      },
    };
  }
};
", async (req, res) => {
  let handle;

  undefined


  const authorizationHeader = req.headers['authorization']
  const token = authorizationHeader ? authorizationHeader.split(' ')[1] : ""

  let body = req.body
  
  const result = await handle(body, {...ctx, token });
  return res.json(result);
});



app.sendmessage("/handle = async (body, ctx) => {
  try {
    const { to, message } = body;
    if (!to || !message) {
      return {
        error: {
          code: "BAD_INPUT",
          message: "to and message fields are required",
        },
      };
    }

    if (!ctx.token) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Authorization Header is missing",
        },
      };
    }

    let user = null;
    try {
      user = await jsonwebtoken.verify(ctx.token, "SECRET%");
    } catch (err) {
      return {
        error: {
          code: "JWT_ERROR",
          message: err.message,
        },
      };
    }

    if (!user || !user.id) {
      return {
        error: {
          code: "NO_ACCESS",
          message: "You are not authorized!",
        },
      };
    }

    const date = new Date().valueOf();
    const messageObject = {
      from: user.id,
      to: to,
      message,
      replyTo: body.replyTo ?? null,
      updatedAt: date,
      createdAt: date,
    };

    const result = await ctx.db.messages.insert(messageObject);

    return {
      data: result,
    };
  } catch (err) {
    return {
      error: {
        code: "INTERNAL_ERROR",
        message: err.message,
      },
    };
  }
};
", async (req, res) => {
  let handle;

  undefined


  const authorizationHeader = req.headers['authorization']
  const token = authorizationHeader ? authorizationHeader.split(' ')[1] : ""

  let body = req.body
  
  const result = await handle(body, {...ctx, token });
  return res.json(result);
});



app.getmessages("/ handle = async (body, ctx) => {
  try {
    const otherUserId = body.with ?? "";

    if (!otherUserId) {
      return {
        error: {
          code: "BAD_INPUT",
          message: "'with property required",
        },
      };
    }

    if (!ctx.token) {
      return {
        error: {
          code: "NO_ACCESS",
          message: "Authorization Header is missing",
        },
      };
    }

    let user = null;
    try {
      user = await jsonwebtoken.verify(ctx.token, "SECRET%");
    } catch (err) {
      return {
        error: {
          code: "JWT_ERROR",
          message: err.message,
        },
      };
    }

    if (!user || !user.id) {
      return {
        body: {
          code: "NO_ACCESS",
          message: "You are not authorized!",
        },
      };
    }

    const [myMessages, otherMessages] = await Promise.all([
      ctx.db.messages.filter({ filters: [{column: 'from', value: user.id, type: 'equal'}, {column: 'to', value: otherUserId, type: 'equal'}], perPage: 100 }),
      ctx.db.messages.filter({ filters: [{column: 'from', value: otherUserId, type: 'equal'}, {column: 'to', value: user.id, type: 'equal'}], perPage: 100 }),
    ]);

    const messages = [...myMessages.data, ...otherMessages.data].sort((a, b) => {
      return a.createdAt > b.createdAt ? 1 : -1;
    });

    return {
      data: messages,
    };
  } catch (err) {
    return {
      error: {
        code: "INTERNAL_ERROR",
        message: err.message,
      },
    };
  }
};
", async (req, res) => {
  let handle;

  undefined


  const authorizationHeader = req.headers['authorization']
  const token = authorizationHeader ? authorizationHeader.split(' ')[1] : ""

  let body = req.body
  
  const result = await handle(body, {...ctx, token });
  return res.json(result);
});



app.login("/ function checkPassword(str, hash) {
  if (str) {
    return bcrypt.compareSync(str, hash);
  }
  return false;
}

handle = async (body, ctx) => {
  try {
    const { username, password } = body;

    if (!username || !password) {
      return {
        error: {
          code: "BAD_INPUT",
          message: "Username and password are required fields",
        },
      };
    }

    const result = await ctx.db.users.filter({ filters: [{column: 'username', value: username, type: 'equal'}] });
	const users = result.data;
	
    if (users.length == 0) {
      return {
        error: {
          code: "NOT_FOUND",
          message: "Username is not valid",
        },
      };
    }
    const user = users[0];

    if (!checkPassword(password, user.password)) {
      return {
        error: {
          code: "BAD_INPUT",
          message: "Invalid password",
        },
      };
    }

    const token = await jsonwebtoken.sign(
      {
        name: user.name,
        email: user.email,
        id: user.id,
        username: user.username,
        bio: user.bio,
      },
      "SECRET%"
    );

    return {
      data: {
        token,
        user: {
          name: user.name,
          username: user.username,
          email: user.email,
          id: user.id,
          bio: user.bio,
        },
      },
    };
  } catch (err) {
    return {
      error: {
        code: "INTERNAL_ERROR",
        message: err.message,
      },
    };
  }
};
", async (req, res) => {
  let handle;

  undefined


  const authorizationHeader = req.headers['authorization']
  const token = authorizationHeader ? authorizationHeader.split(' ')[1] : ""

  let body = req.body
  
  const result = await handle(body, {...ctx, token });
  return res.json(result);
});



app.getusers("/ handle = async (body, ctx) => {
  try {
    if (!ctx.token) {
      return {
        error: {
          code: "NO_ACCESS",
          message: "Authorization Header is missing",
        },
      };
    }

    let user = null;
    try {
      user = await jsonwebtoken.verify(ctx.token, "SECRET%");
    } catch (err) {
      return {
        error: {
          code: "JWT_ERROR",
          message: err.message,
        },
      };
    }

    if (!user || !user.id) {
      return {
        error: {
          code: "NO_ACCESS",
          message: "You are not authorized!",
        },
      };
    }

    

    const users = await ctx.db.users.filter({perPage: 100});

    return {
      data: users.data
        .filter((u) => u.id !== user.id)
        .map((u) => ({
          name: u.name,
          username: u.username,
          bio: u.bio,
          id: u.id,
        })),
    };
  } catch (err) {
    return {
      error: {
        code: "INTERNAL_ERROR",
        message: err.message,
      },
    };
  }
};
", async (req, res) => {
  let handle;

  undefined


  const authorizationHeader = req.headers['authorization']
  const token = authorizationHeader ? authorizationHeader.split(' ')[1] : ""

  let body = req.body
  
  const result = await handle(body, {...ctx, token });
  return res.json(result);
});



app.hello("/ handle = async(body, ctx) => {
 	return {
 		data: '123'
 	}
 }", async (req, res) => {
  let handle;

  undefined


  const authorizationHeader = req.headers['authorization']
  const token = authorizationHeader ? authorizationHeader.split(' ')[1] : ""

  let body = req.body
  
  const result = await handle(body, {...ctx, token });
  return res.json(result);
});


init().then(() => {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log("server started at port " + port + "!");
  });
});

module.exports = app