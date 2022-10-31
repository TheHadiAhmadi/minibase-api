import adapter from "@sveltejs/adapter-node";
import sveltePreprocess from "svelte-preprocess";
import path from "path";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: sveltePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      $lib: path.resolve("./src/lib"),
    },
  },
};

export default config;
