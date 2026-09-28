# Instructions for coding agents

## Motion and animation

- Before investigating, planning, reviewing, or changing any animation, read
  [`docs/motion-system.md`](docs/motion-system.md) first. Treat it as the source
  of truth for current behavior and the reasons behind it.
- Keep the code and motion-system documentation in sync. When changing an
  animation, update the relevant description with its current behavior, reason,
  and previous behavior in the same change.
- Distinguish native Motion springs from the CSS `linear()` approximation and
  the critically damped cursor solver. Do not describe the latter two as native
  Motion runtime animations.
- Check both transition directions and `prefers-reduced-motion` when the change
  affects them.
