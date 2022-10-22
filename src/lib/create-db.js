import db from "./db";

export function createDB(project, collection) {
  return {
    async insert(data) {
      console.log("JS: insert");
      console.time("JS: insert");
      const id = crypto.randomUUID();
      await db("rows").insert({
        id,
        project,
        collection,
        data: JSON.stringify(data),
      });

      console.timeEnd("JS: insert");
      return { ...data, id };
    },
    async remove(id) {
      console.log("JS: remove");
      console.time("JS: remove");
      await db("rows").delete().where({ project, collection, id });

      console.timeEnd("JS: remove");
      return true;
    },
    async update(id, data) {
      console.time("JS: update");
      await db("rows").update({ data }).where({ id, project, collection });
      console.timeEnd("JS: update");
      return { ...data, id };
    },
    async get(id) {
      console.log("JS: get");
      console.time("JS: get");

      const result = await db("rows")
        .select("data", "id")
        .where({ project, collection, id })
        .first();

      if (!result) return null;
      console.time("JS: get");

      return { ...result.data, id: result.id };
    },
    async find(filter = {}, options = {}) {
      console.log("JS: find");
      console.time("JS: find");
      let result = await db("rows")
        .select("data", "id")
        .where({ project, collection });
      const take = options.take ?? -1;
      const skip = options.skip ?? 0;

      result = result
        .map((res) => ({ ...res.data, id: res.id }))
        .filter((data) => {
          Object.entries(filter).map(([key, value]) => {
            if (data[key] !== value) {
              return false;
            }
          });
          return true;
        });
      if (take === -1) return result.slice(skip);
      if (take > result.length) return result.slice(skip);

      console.timeEnd("JS: find");

      return result.slice(skip, skip + take);
    },
  };
}
