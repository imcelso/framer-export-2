import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const out = path.resolve(process.cwd(), "out");

// 1. 页面导出后文件名没有扩展名，GitHub Pages 只会按扩展名判断文件类型，
//    无扩展名的文件会被当成二进制下载而不是网页，所以补上 .html。
for (const entry of await readdir(out, { withFileTypes: true })) {
  if (!entry.isFile() || entry.name.includes(".")) continue;
  await rename(path.join(out, entry.name), path.join(out, `${entry.name}.html`));
}

// 2. 页面里指向 /assets 和站内页面的链接原本是根绝对路径，
//    改成相对路径后，放在根域名或 /仓库名/ 子路径下都能正常加载。
for (const name of await readdir(out)) {
  if (!name.endsWith(".html")) continue;

  const file = path.join(out, name);
  const html = await readFile(file, "utf8");
  const patched = html
    .replaceAll("/assets/", "./assets/")
    .replace(
      /(href|content)="(?:\.?\/)([A-Za-z0-9-]*)(#[^"]*)?"/g,
      (_, attr, route, hash = "") =>
        `${attr}="./${route}${route ? ".html" : ""}${hash}"`,
    );

  if (patched !== html) await writeFile(file, patched);
}

// 3. 兜底：万一改用「分支部署」而不是 Actions 部署，Jekyll 会忽略 _next 目录。
await writeFile(path.join(out, ".nojekyll"), "");