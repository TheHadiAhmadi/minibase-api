import db from "./db";

export function createDB(project, collection) {
    return {
      async insert(data) {
        const id = crypto.randomUUID();
        await db("rows").insert({
          id,
          project,
          collection,
          data: JSON.stringify(data),
        });
        return { ...data, id };
      },
      async remove(id) {
        await db("rows").delete().where({ project, collection, id });
        return true;
      },
      async update(id, data) {
        await db("rows").update({ data }).where({ id, project, collection });
        return { ...data, id };
      },
      async get(id) {
        const result = await db("rows")
          .select("data", "id")
          .where({ project, collection, id })
          .first();
  
        if (!result) return null;
  
        return { ...result.data, id: result.id };
      },
      async find(filter = {}, options = {}) {
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
  
        return result.slice(skip, skip + take);
      },
    };
  }