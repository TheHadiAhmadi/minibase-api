import db from "$lib/server/db";
import type { CollectionRow } from "$lib/types";

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
      await db("rows")
        .update({ data: JSON.stringify(data) })
        .where({ id, project, collection });
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
    async filter({ filters, sort, page, perPage } = {}) {
      console.log("JS: find");
      console.time("JS: find");
      let allRows = await db("rows")
        .select("data", "id")
        .where({ project, collection })
        .then((rows) => rows.map((row) => ({ ...row.data, id: row.id })));

      function applyFilter(rows: CollectionRow[]) {
        if (!filters || filters.length === 0) return rows;
        for (const filter of filters ?? []) {
          rows = rows.filter((row) => {
            if (
              filter.type === "like" &&
              typeof row[filter.column] === "string"
            ) {
              return (row[filter.column] as string).includes(filter.value);
            } else if (filter.type === "equal") {
              return row[filter.column] === filter.value;
            } else if (filter.type === "in") {
              return filter.value.includes(row[filter.column]);
            } else if (filter.type === "between") {
              return (
                row[filter.column] >= filter.value[0] &&
                row[filter.column] <= filter.value[1]
              );
            }
          });
        }
        return rows;
      }

      function applySort(rows: CollectionRow[]) {
        if (!sort) return rows;
        return rows.sort((a, b) => {
          const column = sort.column;
          const order = sort.order;
          let multiplier = 1;

          if (order === "asc") multiplier = -1;

          return multiplier * (a[column] > b[column] ? 1 : -1);
        });
      }
      function applyPagination(rows: CollectionRow[]) {
        if (!page) page = 1;
        if (!perPage) perPage = 10;
        const offset = (page - 1) * perPage;

        let data;
        if (perPage !== 0) {
          data = rows.slice(offset, offset + perPage);
        } else {
          data = rows.slice(offset);
        }

        return {
          data,
          perPage,
          page,
          total: allRows.length,
          lastPage: Math.ceil(allRows.length / perPage),
        };
      }

      return applyPagination(applySort(applyFilter(allRows)));
    },
  };
}
