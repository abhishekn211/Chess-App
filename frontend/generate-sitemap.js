// generate-sitemap.js
import fs from "fs";
import { SitemapStream, streamToPromise } from "sitemap";

const sitemap = new SitemapStream({ hostname: "https://chess-app-opal.vercel.app" });

const urls = [
  "/",
  "/home",
  "/profile",
  "/game"
];

urls.forEach(url => sitemap.write({ url }));

sitemap.end();

streamToPromise(sitemap).then(data => {
  fs.writeFileSync("./public/sitemap.xml", data.toString());
});