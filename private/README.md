# private/ — reviewer-only assets

> ⚠️ **PRIVATE — reviewer only. Never expose to candidates.**

This directory holds answer-key assets that must **never** be candidate-accessible.
Nothing here is served from `public/`. It is read only by admin-guarded server
routes (e.g. `app/api/admin/bug-image/[key]/route.ts`, which returns 403 for any
non-admin).

## `bug-shots/`

Per-bug "clean vs buggy" screenshots used by the admin bug-control panel's
**Preview** modal. Files are named:

```
private/bug-shots/<BUG_KEY>-clean.png    # the correct reference (admin) view
private/bug-shots/<BUG_KEY>-buggy.png     # the defective (customer) view, flag ON
```

These are captured in a separate, later step. Until a file exists the image
route 404s and the panel shows a "Screenshot pending" placeholder — so the panel
works before any screenshots are captured.

The PNGs themselves are git-ignored (they are large, regenerable answer-key
artifacts); only this README and `bug-shots/.gitkeep` are tracked so the folder
structure survives a fresh clone.
