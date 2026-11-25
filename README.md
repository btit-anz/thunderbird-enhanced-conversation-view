# Thunderbird Enhanced Conversation View

BTIT's extension of [Thunderbird Conversations](https://github.com/thunderbird-conversations/thunderbird-conversations). Collapsed conversation rows show the original and latest sender, for example **Fred, Matt (3)**, in both Cards and Table views.

The latest sender is selected by message date. Hovering shows the complete sender headers. Expanding a thread restores the individual message senders. New replies update the summary through Thunderbird's normal rendering lifecycle.

## Upstream and overrides

This repository keeps the original project in the unmodified `upstream/` Git submodule, pinned to commit `cf37c618f31b1796ca43ea04b15f1019dd3f080d` (Conversations 4.3.18). BTIT changes are maintained separately:

| Path | Purpose |
| --- | --- |
| `overrides/config.json` | Upstream commit, release version and explicit overlay list |
| `overrides/patches/` | Small lifecycle integration patch; fails if upstream no longer matches |
| `overrides/files/` | Sender renderer and its automated tests |
| `scripts/manage.mjs` | Exports pristine upstream, applies overrides, tests and builds |
| `validation/` | Recorded integration evidence using synthetic mail |

Upstream files are copied to ignored `.build/conversations/` for compilation. The submodule is never patched in place. The extension ID remains `gconversation@xulforum.org`, so this build replaces the original Conversations installation.

## Build and test

Requires Node.js 24 or newer, npm, Git, tar, zip and the upstream build dependencies. Build scripts use a POSIX environment, such as Linux or WSL.

```sh
git clone --recurse-submodules https://github.com/btit-anz/thunderbird-enhanced-conversation-view.git
cd thunderbird-enhanced-conversation-view
npm run verify
```

`verify` prepares pristine source, installs the pinned upstream dependencies, runs the complete upstream checks plus the added tests, and builds `artifacts/BTIT-Conversations-4.3.18.1.xpi`.

Other commands: `npm run prepare:source`, `npm test`, and `npm run build`. Each prepares fresh source before running, so edits belong in `overrides/`, not `.build/`.

GitHub Actions runs the same verification on pull requests and changes to `main`, and saves the installable XPI as a workflow artifact. The live Thunderbird checks recorded under `validation/` are separate from this automated workflow.

## Install

In Thunderbird, open **Tools → Add-ons and Themes → gear → Install Add-on From File**. Select the built XPI and accept the Conversations update. Disable automatic updates for this extension if you want to retain BTIT's modification: an upstream release can replace it. Thunderbird and other add-ons may continue updating normally.

Tested on Thunderbird **159.0**. The upstream manifest's broader compatibility range has not been validated for this enhancement.

## Scope

The summary covers messages in Thunderbird's current folder or search view. Replies outside that view are not included in the list summary. Conversations' existing message reader can still aggregate across folders as before. Expanded, unthreaded and grouped-by-sort rows retain their native display. This enhancement changes presentation, not message contents or sorting.

## Maintenance

See [Updating upstream](docs/UPSTREAM.md) for the upgrade process and [validation notes](validation/README.md) for test evidence.

BTIT maintains this derivative independently. This repository is not an official Thunderbird product, and no upstream acceptance is implied. Respect the original project's contribution and maintenance terms when approaching its maintainers.

## License and attribution

MPL-2.0. Original Thunderbird Conversations attribution and license headers are retained. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
