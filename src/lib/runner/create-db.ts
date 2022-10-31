import db from "$lib/server/db";

export function createDB(project: string, collection: string) {
  return {
    async insert(data: any) {
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
    async remove(id: string) {
      console.log("JS: remove");
      console.time("JS: remove");
      await db("rows").delete().where({ project, collection, id });

      console.timeEnd("JS: remove");
      return true;
    },
    async update(id: string, data: any) {
      console.time("JS: update");
      await db("rows").update({ data: JSON.stringify(data) }).where({ id, project, collection });
      console.timeEnd("JS: update");
      return { ...data, id };
    },
    async get(id: string) {
      console.log("JS: get");
      console.time("JS: get");

      const result = await db("rows")
        .select("data", "id")
        .where({ project, collection, id })
        .first();

      if (!result) return null;
      console.time("JS: get");

      return { ...JSON.parse(result.data), id: result.id };
    },
    async find(filter: any = {}, options: any = {}) {
      console.log("JS: find");
      console.time("JS: find");
      let result = await db("rows")
        .select("data", "id")
        .where({ project, collection });
      const take = options.take ?? -1;
      const skip = options.skip ?? 0;

      result = result
        .map((res) => ({ ...JSON.parse(res.data), id: res.id }))
        .filter((data) => {
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

      console.timeEnd("JS: find");

      return result.slice(skip, skip + take);
    },
  };
}
