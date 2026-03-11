# boringcache/ruby-action

Setup Ruby and cache Bundler gems with BoringCache.

Installs Ruby via [mise](https://mise.jdx.dev), restores cached directories before your job runs, and saves them when it finishes. Caches are content-addressed — identical content is never re-uploaded.

## Quick start

```yaml
- uses: boringcache/ruby-action@v1
  with:
    workspace: my-org/my-project
  env:
    BORINGCACHE_SAVE_TOKEN: ${{ secrets.BORINGCACHE_SAVE_TOKEN }}

- run: bundle install
- run: bundle exec rake test
```

## Recommended auth model

For new workflows, provide a restore token to every job and only provide a save token to trusted branch/tag jobs:

```yaml
env:
  BORINGCACHE_RESTORE_TOKEN: ${{ secrets.BORINGCACHE_RESTORE_TOKEN }}
  BORINGCACHE_SAVE_TOKEN: ${{ github.event_name == 'pull_request' && '' || secrets.BORINGCACHE_SAVE_TOKEN }}
```

On pull requests, the action restores caches and skips the post-save step when no save-capable token is configured.

## Mental model

This action caches the Ruby directories you explicitly choose.

- Ruby is installed via mise.
- Bundled gems are restored if a matching cache exists.
- Updated caches are saved after the job completes.

This action does not infer what should be cached and does not modify your build commands.

Version detection order:
- `.ruby-version`
- `.tool-versions` (asdf/mise format)

If no version file is found, defaults to Ruby 3.3.

Cache tags:
- Ruby: `{cache-tag}-ruby-{version}`
- Gems: `{cache-tag}-gems`

What gets cached:
- `~/.local/share/mise` — Ruby installation
- `vendor/bundle` — Bundled gems

The `exclude: '*.out'` default excludes gem build logs (`gem_make.out`) that contain non-deterministic paths.

## Common patterns

### Simple Ruby project

```yaml
- uses: boringcache/ruby-action@v1
  with:
    workspace: my-org/my-project
  env:
    BORINGCACHE_SAVE_TOKEN: ${{ secrets.BORINGCACHE_SAVE_TOKEN }}

- run: bundle install
- run: bundle exec rspec
```

### Rails application

```yaml
- uses: boringcache/ruby-action@v1
  with:
    workspace: my-org/my-rails-app
  env:
    BORINGCACHE_SAVE_TOKEN: ${{ secrets.BORINGCACHE_SAVE_TOKEN }}

- run: bundle install
- run: bin/rails db:setup
- run: bin/rails test
```

### Version pinning

```yaml
- uses: boringcache/ruby-action@v1
  with:
    workspace: my-org/my-project
    ruby-version: '3.2'
  env:
    BORINGCACHE_SAVE_TOKEN: ${{ secrets.BORINGCACHE_SAVE_TOKEN }}
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `workspace` | No | repo name | Workspace in `org/repo` form. |
| `ruby-version` | No | from file | Ruby version. Reads `.ruby-version` or `.tool-versions`. |
| `working-directory` | No | `.` | Working directory for bundle install. |
| `bundle-path` | No | `vendor/bundle` | Gem install path. |
| `cache-ruby` | No | `true` | Cache Ruby installation. |
| `cache-tag` | No | `ruby` | Base tag for cache entries. |
| `exclude` | No | `*.out` | Glob patterns to exclude from cache. |
| `save-always` | No | `false` | Save cache even if job fails. |
| `verbose` | No | `false` | Enable detailed output. |

## Outputs

| Output | Description |
|--------|-------------|
| `ruby-version` | Installed Ruby version |
| `cache-hit` | Whether bundle cache was restored |
| `ruby-cache-hit` | Whether Ruby cache was restored |
| `cache-key` | Bundle cache key |
| `ruby-key` | Ruby cache key |
| `workspace` | Resolved workspace name |

## Platform behavior

Platform scoping is what makes it safe to reuse caches across machines.

By default, caches are isolated by OS and architecture. Ruby native extensions are platform-specific, so cross-platform caching is not recommended for gems with native code.

## Environment variables

| Variable | Description |
|----------|-------------|
| `BORINGCACHE_RESTORE_TOKEN` | Restore-capable token for pull requests and other read-only jobs |
| `BORINGCACHE_SAVE_TOKEN` | Save-capable token for trusted jobs that should publish cache updates |
| `BORINGCACHE_DEFAULT_WORKSPACE` | Default workspace (if not specified in inputs) |

## Troubleshooting

- Unauthorized or workspace not found: ensure the appropriate BoringCache token is set and the workspace exists.
- Cache miss: check `workspace` and version detection files.
- Gem build issues: the `exclude: '*.out'` default handles non-deterministic build logs.

## Release notes

See https://github.com/boringcache/ruby-action/releases.

## License

MIT
