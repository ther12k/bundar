export function purl(name: string, version: string): string {
  return `pkg:npm/${name.replace("@", "%40").replace("/", "/")}@${version}`;
}
