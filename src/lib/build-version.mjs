/**
 * Resolve explicitly supplied build metadata. Never infer a deployment from Git.
 * @param {unknown} commit
 * @param {unknown} repository
 */
export function resolveBuildVersion(commit, repository) {
  if (typeof commit !== "string" || typeof repository !== "string") return null;
  const sha = commit.trim().toLowerCase();
  const repo = repository.trim();
  const parts = repo.split("/");
  if (!/^[a-f0-9]{40}$/.test(sha) || parts.length !== 2) return null;
  const [owner, name] = parts;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i.test(owner) || owner.includes("--")) return null;
  if (!/^[a-z0-9._-]{1,100}$/i.test(name) || name === "." || name === "..") return null;
  return { sha, shortSha: sha.slice(0, 7), href: `https://github.com/${repo}/commit/${sha}` };
}
