# boringcache/ruby-action

Set up Ruby via mise and cache Ruby plus Bundler gems with BoringCache.

## Quick start

```yaml
- uses: boringcache/ruby-action@v1
  with:
    workspace: my-org/my-project
  env:
    BORINGCACHE_RESTORE_TOKEN: ${{ secrets.BORINGCACHE_RESTORE_TOKEN }}
    BORINGCACHE_SAVE_TOKEN: ${{ github.event_name == 'pull_request' && '' || secrets.BORINGCACHE_SAVE_TOKEN }}

- run: bundle install
- run: bundle exec rspec
```

## What it caches

- Ruby from `.ruby-version` or `.tool-versions` (fallback: `3.3`).
- The Ruby installation under mise.
- `vendor/bundle`.
- `*.out` files are excluded by default to avoid noisy gem build logs.

## Key inputs

| Input | Description |
|-------|-------------|
| `workspace` | Workspace in `org/repo` form. |
| `ruby-version` | Override the detected Ruby version. |
| `bundle-path` | Bundler install path. Default: `vendor/bundle`. |
| `cache-ruby` | Cache the Ruby installation from mise. |
| `working-directory` | Project directory to inspect. |
| `exclude` | Extra glob patterns to exclude. |
| `save-always` | Save even if the job fails. |

## Outputs

| Output | Description |
|--------|-------------|
| `ruby-version` | Installed Ruby version. |
| `cache-hit` | Whether the bundle cache was restored. |
| `ruby-cache-hit` | Whether the Ruby runtime cache was restored. |
| `workspace` | Resolved workspace name. |

## Docs

- [Language actions docs](https://boringcache.com/docs#language-actions)
- [GitHub Actions auth and trust model](https://boringcache.com/docs#actions-auth)
