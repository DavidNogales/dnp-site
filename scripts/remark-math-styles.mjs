// Inspect parsed math nodes, not dollar signs inside code or ordinary prose.
export default function remarkMathStyles() {
  return (tree, file) => {
    const hasMath = (node) => node.type === "math" || node.type === "inlineMath"
      || (node.children ?? []).some(hasMath);
    file.data.astro.frontmatter.hasMath = hasMath(tree);
  };
}
