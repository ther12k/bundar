# create-bundar

The `bun create bundar` project scaffolder (GH-071): generates a minimal,
runnable, secure-by-default Bundar application with explicit dialect and
structure selection. Templates are code (`./templates`) so every generated
file is dialect-correct by construction.

## Usage

```bash
bun create-bundar/src/bin.ts <target> [flags]
```

| Flag | Values | Default |
| --- | --- | --- |
| `--dialect` | `htmx2` \| `htmx4-experimental` | `htmx2` |
| `--structure` | `compact` \| `feature` | `compact` |
| `--name` | package name | target basename |
| `--dry-run` | flag — render without writing | off |
| `--json` | flag — with `--dry-run`, print a JSON manifest | off |

- **compact** (default): the classic minimal starter — one app module.
- **feature** ([ADR-0019](../decisions/0019-agent-friendly-feature-slices.md)):
  feature-sliced tree (`src/features/subscribe/*`, `src/platform/`) that
  passes `bun run app:arch`.

Unknown dialect or structure values fail with exit code 1. The target
directory must be empty or not exist; existing files are never overwritten.

## Examples

```bash
# dry-run manifest
bun create-bundar/src/bin.ts my-app --structure feature --dry-run --json

# agent-friendly layout, experimental dialect
bun create-bundar/src/bin.ts my-app --structure feature --dialect htmx4-experimental
```
