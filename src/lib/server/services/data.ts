import db from "$lib/server/db";
import type {
  ServiceDeleteData,
  ServiceEditData,
  ServiceGetData,
  ServiceGetRows,
  ServiceInsertData,
} from "$lib/types/services/data.types";

export const getRows: ServiceGetRows = async ({ project, collection }) => {
  const rows = await db("rows")
    .select("data", "id")
    .where({ project, collection });

  console.log("DATA: ", rows);

  return rows.map((row) => ({ ...JSON.parse(row.data), id: row.id }));
};

export const editData: ServiceEditData = async ({
  project,
  collection,
  id,
  body: data,
}) => {
  await db("rows")
    .update({ data: JSON.stringify(data) })
    .where({ project, collection, id });
  return { ...data, id };
};

export const deleteData: ServiceDeleteData = async ({
  project,
  collection,
  id,
}) => {
  await db("rows").delete().where({ project, collection, id });
  return true;
};

export const getData: ServiceGetData = async ({ project, collection, id }) => {
  const result = await db("rows")
    .select("id", "data")
    .where({ project, collection, id })
    .first();

  return { ...JSON.parse(result.data), id: result.id };
};

export const insertData: ServiceInsertData = async ({
  project,
  collection,
  body: data,
}) => {
  console.log("insert", data);
  if (Array.isArray(data)) {
    const d = data.map((dat) => {
      const id = crypto.randomUUID();
      return {
        project,
        collection,
        data: JSON.stringify(dat),
        id,
      };
    });
    await db("rows").insert(d);

    return d.map((dd) => ({ ...JSON.parse(dd.data), id: dd.id }));
  }

  const id = crypto.randomUUID();
  await db("rows").insert({
    project,
    collection,
    data: JSON.stringify(data),
    id,
  });

  return { ...data, id };
};
