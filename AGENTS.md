<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Accessibility prefs are device-local (localStorage) applied as `data-*` attributes on `<html>` and styled in `styles.css`; why: works without accounts and across all components.
- Self-hosted download lives in `selfhost/`: a Vite build (`selfhost/vite.selfhost.mjs`) aliases the cloud client to `selfhost/client/supabase-shim.ts`, which talks to the PHP+SQLite API in `selfhost/server/`; why: lets the same game code run on the user's own PHP host without Lovable. Keep shim, PHP table rules and RPCs in sync when Online.tsx queries change.
- Player-facing names/descriptions and Pärt's lines live in `src/game/tekstid.ts` and are applied onto data objects by `applyTekstid`; the self-hosted build also loads an optional `tekstid.json` at runtime; why: typo fixes in one place, editable on the user's server without rebuilding.
- Tutorial milestones use stable IDs persisted in the game save and are updated by the engine; why: spending resources or declining needs must not undo completed onboarding.
