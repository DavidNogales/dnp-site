import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return rss({
    title: "David Nogales Pérez",
    description: "Technical notes about software, data, and infrastructure.",
    site: context.site,
    items: posts.map((post) => ({ ...post.data, link: `/blog/${post.id}/`, pubDate: post.data.published })),
  });
}
