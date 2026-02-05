# boringcache/ruby-action

**Cache once. Reuse everywhere.**

BoringCache is a universal build artifact cache for CI, Docker, and local development. It stores and restores directories you choose so build outputs, dependencies, and tool caches can be reused across environments.

BoringCache does not run builds and is not tied to any build tool. It works with any language, framework, or workflow by caching directories explicitly selected by the user.

Caches are content-addressed and verified before restore. If identical content already exists, uploads are skipped. The same cache can be reused in GitHub Actions, Docker/BuildKit, and on developer machines using the same CLI.

This action installs Ruby and configures BoringCache to cache its artifacts. It uses the same BoringCache CLI and cache format as all other BoringCache actions.

## Quick start

```yaml
- uses: boringcache/ruby-action@v1
  with:
    workspace: my-org/my-project
  env:
    BORINGCACHE_API_TOKEN: ${{ secrets.BORINGCACHE_API_TOKEN }}

- run: bundle install
- run: bundle exec rake test
```

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
    BORINGCACHE_API_TOKEN: ${{ secrets.BORINGCACHE_API_TOKEN }}

- run: bundle install
- run: bundle exec rspec
```

### Rails application

```yaml
- uses: boringcache/ruby-action@v1
  with:
    workspace: my-org/my-rails-app
  env:
    BORINGCACHE_API_TOKEN: ${{ secrets.BORINGCACHE_API_TOKEN }}

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
    BORINGCACHE_API_TOKEN: ${{ secrets.BORINGCACHE_API_TOKEN }}
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
| `BORINGCACHE_API_TOKEN` | API token (required) |
| `BORINGCACHE_DEFAULT_WORKSPACE` | Default workspace (if not specified in inputs) |

## Troubleshooting

- Unauthorized or workspace not found: ensure `BORINGCACHE_API_TOKEN` is set and the workspace exists.
- Cache miss: check `workspace` and version detection files.
- Gem build issues: the `exclude: '*.out'` default handles non-deterministic build logs.

## Release notes

See https://github.com/boringcache/ruby-action/releases.

## License

MIT
