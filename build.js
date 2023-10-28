const esbuild = require("esbuild");
const fs = require("fs/promises");
const fsButWihtoutPromises = require("fs");
const path = require("path");

function findClosingBrace(string) {
  let c = 0;
  let i = 0;
  // prob doesn't work with unicode
  while (i < string.length) {
    const ch = string[i];
    if (ch === "{") c++;
    else if (ch === "}") c--;
    if (c == -1) return i;
    i++;
  }
  return null;
}

function transformToUseRust(args) {
  const content = fsButWihtoutPromises.readFileSync(args.path, "utf8");
  const splits = content.split(/["']use rust["'];/);
  let result = splits[0];
  for (let i = 1; i < splits.length; i++) {
    const endOfRustCode = findClosingBrace(splits[i]);
    const rustCode = splits[i].slice(0, endOfRustCode);
    result += `return runRust("${encodeURIComponent(rustCode)}");`;
    result += splits[i].slice(endOfRustCode, splits[i].length);
  }
  return result;
}

const useRustPlugin = {
  name: "use-rust",
  setup(build) {
    build.onLoad({ filter: /.js$/ }, (args) => ({
      contents: transformToUseRust(args),
      loader: "js",
    }));

    build.onLoad({ filter: /.jsx$/ }, (args) => ({
      contents: transformToUseRust(args),
      loader: "jsx",
    }));
  },
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function build() {
  await fs.rm("dist", { recursive: true, force: true });
  await fs.mkdir("dist", { recursive: true });

  console.log("Building project");
  await sleep(Math.random() * 5000); // gotta keep up with the trends

  await esbuild.build({
    entryPoints: ["client.jsx"],
    outfile: "dist/js.js",
    minify: true,
    bundle: true,
    sourcemap: true,
    plugins: [useRustPlugin],
  });

  await fs.cp("index.html", "dist/index.html");
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
