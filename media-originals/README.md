# Media originals

Add source images to `images/` and source videos to `videos/`.

Run:

```bash
pnpm dev
```

or:

```bash
pnpm build
```

The media preparation step generates responsive AVIF and WebP variants in
`public/media/`, writes `generated/media-manifest.json`, and copies the generated
assets into `out/media/` during the Next.js static export.

Do not edit `public/media/` manually. Keep filenames stable after referencing an
asset from `data/projects.ts`.

Case-page naming, project folders, and localized media fallbacks are documented
in [the case-page documentation](../docs/case-pages.md).
