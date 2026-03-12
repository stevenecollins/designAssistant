const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const isWatch = process.argv.includes("--watch");

// Plugin to inline the JS bundle into the HTML template
const inlineHtmlPlugin = {
  name: "inline-html",
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) return;

      const jsPath = path.join(__dirname, "dist", "ui.js");
      const htmlTemplatePath = path.join(__dirname, "src", "ui", "index.html");
      const htmlOutPath = path.join(__dirname, "dist", "ui.html");

      if (!fs.existsSync(jsPath)) return;

      const js = fs.readFileSync(jsPath, "utf8");
      const html = fs.readFileSync(htmlTemplatePath, "utf8");

      const finalHtml = html.replace(
        "<!-- INLINE_SCRIPT -->",
        `<script>${js}</script>`
      );

      fs.writeFileSync(htmlOutPath, finalHtml);
      fs.unlinkSync(jsPath); // Clean up the intermediate JS file
      console.log("Built ui.html with inlined JS");
    });
  },
};

async function build() {
  // Ensure dist directory exists
  fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });

  // Build config for plugin sandbox (code.ts)
  const sandboxConfig = {
    entryPoints: ["src/code.ts"],
    bundle: true,
    outfile: "dist/code.js",
    target: "es2017",
    format: "iife",
    logLevel: "info",
  };

  // Build config for UI (React app)
  const uiConfig = {
    entryPoints: ["src/ui/App.tsx"],
    bundle: true,
    outfile: "dist/ui.js",
    target: "es2020",
    format: "iife",
    jsx: "automatic",
    logLevel: "info",
    plugins: [inlineHtmlPlugin],
  };

  if (isWatch) {
    const sandboxCtx = await esbuild.context(sandboxConfig);
    const uiCtx = await esbuild.context(uiConfig);
    await Promise.all([sandboxCtx.watch(), uiCtx.watch()]);
    console.log("Watching for changes...");
  } else {
    await Promise.all([esbuild.build(sandboxConfig), esbuild.build(uiConfig)]);
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
