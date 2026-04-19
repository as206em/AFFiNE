# Empty Column Recovery

## Goal

- Fix doc columns when one column becomes empty.
- Keep structure editable.

## Rules

- `2 Columns`
  - Remove columns block.
  - Flatten remaining content back into note.
  - Preserve left-to-right order.
- `3 Columns`
  - Remove empty column only.
  - Keep remaining 2 columns.
  - Preserve left-to-right order.
- If flattening would leave no content:
  - Seed one empty paragraph in note.

## Scope

- Blocksuite note columns only.
- No UI-only workaround.
- Fix model structure, not just focus behavior.

## Tests

- Empty one column in 2-column layout => note children become normal blocks.
- Empty one column in 3-column layout => columns block remains with 2 columns.
