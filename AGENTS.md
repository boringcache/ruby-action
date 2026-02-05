# BoringCache Ruby

## What It Does

Sets up Ruby via mise and caches:
- Ruby installation
- Bundler gems (`vendor/bundle`)

## Quick Reference

```yaml
- uses: boringcache/ruby@v1
  with:
    workspace: my-org/my-project
    ruby-version: '3.2'
  env:
    BORINGCACHE_API_TOKEN: ${{ secrets.BORINGCACHE_API_TOKEN }}
```

## How It Works

1. **Restore phase**:
   - Restores cached Ruby installation and gems
   - Installs mise (if needed)
   - Installs Ruby via mise
   - Configures bundler path to `vendor/bundle`

2. **Save phase**:
   - Saves Ruby installation and gem bundle

## Cache Tags

Uses `cache-tag` prefix (defaults to repository name) with suffixes:
- `{prefix}-ruby-{version}` - Ruby installation
- `{prefix}-bundle` - Gem bundle

## Version Detection

Auto-detects version from (in order):
1. `ruby-version` input
2. `.ruby-version`
3. `.tool-versions`

## Inputs

| Input | Description |
|-------|-------------|
| `workspace` | BoringCache workspace |
| `ruby-version` | Ruby version (e.g., `3.2`, `3.3.0`) |
| `cache-tag` | Cache tag prefix (defaults to repo name) |
| `bundler-version` | Bundler version to install |
| `exclude` | Glob patterns to exclude (default: `*.out`) |

## Outputs

| Output | Description |
|--------|-------------|
| `cache-hit` | `true` if cache was restored |
| `ruby-version` | Installed Ruby version |
| `ruby-tag` | Cache tag for Ruby installation |
| `bundle-tag` | Cache tag for gem bundle |

## Separate Actions

```yaml
- uses: boringcache/ruby/restore@v1
  id: cache
  with:
    workspace: my-org/my-project
    ruby-version: '3.2'

- run: bundle install

- uses: boringcache/ruby/save@v1
  with:
    workspace: my-org/my-project
    ruby-tag: ${{ steps.cache.outputs.ruby-tag }}
    bundle-tag: ${{ steps.cache.outputs.bundle-tag }}
```

## Code Structure

- `lib/restore.ts` - Restore caches, install Ruby via mise
- `lib/save.ts` - Save caches
- `lib/utils.ts` - Shared utilities, mise helpers

## Build

```bash
npm install && npm run build && npm test
```

---
**See [../AGENTS.md](../AGENTS.md) for shared conventions.**
