
# Update Tags — Obsidian Plugin

A production-ready Obsidian plugin to add, remove, or replace YAML frontmatter `tags` across Markdown files in your vault, with intelligent features, dry-run preview, and comprehensive safety controls.

## Features
- **Unified modal interface**: Single "Modify Tags" command with operation selector (Add/Remove/Replace)
- **Three operations with flexible modes**:
  - **Add tags**: Add one or more tags to files
  - **Remove tags**: Remove specified tags from files
  - **Replace tags**: Find and replace tags with two modes:
    - **Standard mode**: One-to-one replacement (e.g., `old` → `new`, `deprecated` → `updated`)
    - **Replace All mode**: Replace entire tag set when matches found (e.g., files with `draft` → all tags become `final, reviewed`)
- **Dynamic tag suggestions**: Input placeholders show your vault's top 3 most common tags as examples
- **Dry-run preview**: See how many files would change before making edits (configurable default)
- **Smart folder/file suggestions**: As you type, get live suggestions showing both folders 📁 and files 📄 (top 10 by recent modification).
  - Intelligent matching: finds folders by any segment name (type "Prophecy" to find "Bible/2 New Testament/4 Prophecy")
  - Shows end of long paths with "..." prefix for visibility
  - Appears immediately on focus for quick selection
  - Supports both directory and individual file targeting
- **Explicit file targeting**: Enter a comma- or newline-separated list of files to process only those files.
- **Ribbon icon**: Quick access from the left sidebar (optional, can be disabled in settings)
- **Comprehensive settings**:
  - Require scope (prevents accidental vault-wide operations)
  - Allow root changes (safety toggle for vault-wide modifications)
  - Dry-run by default (configurable)
  - Debug mode (optional console logging for troubleshooting)
  - Show/hide ribbon icon
- **Scope validation**: Clear warnings when scope is required but not provided
- **Safe YAML parsing**: Only updates the `tags` key in frontmatter, preserving other metadata

## Usage

- Open the command palette and run: **`Modify Tags`** (or click the ribbon icon if enabled)
- Select operation: **Add tags**, **Remove tags**, or **Replace tags**
- Fill in:
  - For Add/Remove: Enter comma-separated tags (placeholders show examples from your vault)
  - For Replace:
    - Enter tags to find and what to replace them with
    - Check "Replace all tags" to replace entire tag set instead of one-to-one replacement
- Choose scope (optional but recommended):
  - **Folder or File**: Type to see smart suggestions for folders or individual files
  - **Files list**: Enter specific file paths (comma or newline separated)
  - **Leave both empty**: Process entire vault (requires "Allow root changes" in settings)
- Toggle dry-run to preview changes without modifying files (on by default, configurable in settings)
- Click Add/Remove/Replace to run
- Review results modal showing:
  - Changed files with old/new tags
  - "Run Operation" button (dry-run only) to execute after preview
  - "New Operation" button to start another modification

**Settings** (Obsidian Settings → Plugin Options):

- **Require scope**: Force folder/file specification (recommended for safety)
- **Allow root changes**: Enable vault-wide operations when no scope specified
- **Dry-run by default**: Auto-enable preview mode
- **Debug mode**: Enable console logging for troubleshooting
- **Show ribbon icon**: Display quick-access icon in left sidebar

## Install

1. Copy the `update-tags` folder into `.obsidian/plugins/` inside your vault.
2. Enable it in Obsidian Settings → Community plugins.

## Troubleshooting

- If you see errors about missing Modal/Notice/Plugin, ensure Obsidian is up to date and the manifest points to `main.js`.
- For UI issues, reload Obsidian or check the developer console for errors and report them.

## Limitations

- Only works on Markdown files with YAML frontmatter.
- Does not support nested tags or non-standard frontmatter formats.

## License

MIT
