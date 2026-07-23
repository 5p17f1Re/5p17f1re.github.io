# Media originals

Add source images to `images/` and source videos to `videos/`. These originals
stay in the local iCloud workspace and are not committed to Git.

Run:

```bash
pnpm prepare-media
```

The incremental media preparation step compares source hashes, generates only
changed responsive AVIF and WebP variants in `public/media/`, writes
`generated/media-manifest.json`, and copies approved videos. Use
`pnpm prepare-media:force` only when a full rebuild is required for diagnostics.

Commit the changed files from `public/media/` and
`generated/media-manifest.json`. Regular `pnpm dev` and `pnpm build` use those
prepared files without processing the originals.

Do not edit `public/media/` manually. Keep filenames stable after referencing an
asset from `data/projects.ts`.

Case-page naming, project folders, and localized media fallbacks are documented
in [the case-page documentation](../docs/case-pages.md).
