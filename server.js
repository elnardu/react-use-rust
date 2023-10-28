const express = require("express");
const childProcess = require("child_process");
const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const os = require("os");

const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.static("dist"));
app.use(express.json());

function spawn(command, args) {
  return new Promise((resolve) => {
    // damn this api is shit
    const p = childProcess.spawn(command, args);
    const stdouts = [];
    const stderrs = [];

    p.stdout.on("data", (data) => {
      stdouts.push(data);
    });

    p.stderr.on("data", (data) => {
      stderrs.push(data);
    });

    p.on("close", (code) => {
      resolve({
        code: code,
        stdout: Buffer.concat(stdouts).toString(),
        stderr: Buffer.concat(stderrs).toString(),
      });
    });
  });
}

function maketmp() {
  return new Promise((resolve, reject) => {
    fs.mkdtemp(path.join(os.tmpdir(), "use-rust"), (err, dir) => {
      if (err !== null) reject(err);
      else resolve(dir);
    });
  });
}

async function runRust(code) {
  const dir = await maketmp();
  const rustFile = path.join(dir, "main.rs");
  const outFile = path.join(dir, "main");
  await fsPromises.writeFile(rustFile, decodeURIComponent(code));
  await spawn("rustc", [rustFile, "-o", outFile]);
  const out = await spawn(outFile, []);
  return out;
}

app.post("/rpc/rce", async (req, res) => {
  const { code } = req.body;
  const out = await runRust(code);
  res.json(out);
});

async function checkRust() {
  try {
    const out = await spawn("rustc", ["--version"]);
    if (out.code !== 0) {
      throw new Error("Rust is not installed");
    }
  } catch (e) {
    console.error("Please install rust");
    console.error("  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh");
    console.error("Bye!");
    process.exit(1);
  }
}

// Can somebody tell me if top level async is finally ok to use?
(async () => {
  await checkRust();

  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
})();
