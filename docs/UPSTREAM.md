# Updating upstream

The `upstream` submodule tracks an explicit original-project commit. The default BTIT branch is `main`; make changes on a feature branch and open a PR in the BTIT repository.

1. Fetch the original project in `upstream/` and check out the intended release commit.
2. Update `upstreamCommit` and `upstreamVersion` in `overrides/config.json`. Review upstream release notes and source changes affecting native message-row rendering.
3. Increment the BTIT version in `overrides/config.json` and root `package.json`. Preserve the extension ID unless planning a separately installable add-on.
4. Run `npm run verify`. A lifecycle patch conflict must be reviewed and resolved in `overrides/patches/`; never silently ignore a failed patch.
5. Test the built XPI in a disposable Thunderbird profile. Check Cards and Table views, expand/collapse, new replies, unthreaded and grouped views, deletion, switching folders and tabs, and disabling/re-enabling. Include cross-folder search views if claiming support for them.
6. Update the validation notes with what was actually tested. Open the BTIT PR with the submodule update and override changes together.

The build exports the submodule's committed tree, ignoring uncommitted modifications in that directory. `overrides/files/` is the source of BTIT's additional files; `.build/` is disposable build output.

## Contributions to the original project

The original project requires discussion before substantial features, and requires human ownership, authorship and review of submitted code and PR text. Read its `AGENTS.md`, `CONTRIBUTING.md` and `MAINTENANCE-TERMS.md` before any upstream submission. A BTIT feature PR is independent of an upstream contribution.
