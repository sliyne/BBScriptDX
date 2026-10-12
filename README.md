# BBScript Support

BBScriptDX is a VSCode extention that makes BBScript modding much faster and easier. It includes text highlighting and autocomplete, all-in-one conversion from uasset to bbs and back, and a built in hitbox editor. The extention is by default set up for Guity Gear -Strive- but may be out of date. If new instructions that have unique syntaxes are added, they may be highlighted incorrectly.

> [!IMPORTANT]
> This project is an independent modding tool. It is not affiliated with, endorsed by, or sponsored by Arc System Works, Guilty Gear, or Microsoft.

## AI Slop Notice

This project was largely made with AI. My personal view with AI is that it is acceptable when the answer is 100% objective and is not being represented as one's own work. I am not that good at coding right now, and I don't particularly care to learn the ins and outs of VS Code extentions. I just want to mod Guilty Gear. While the extention works, it's pretty speghetti and not of a high quality. If anyone makes a viable replacement for this tool by hand, I will gladly take down this project. If you use AI to replace your own critical thinking or creativity, don't use this.

## Special Thanks

Special thanks to Super Continent, Ghost1512201, Rare_Ani, Pangaea, Ryn, and Kaihelios for making open source projects that made this possible.
Another special thanks to the Guilty Gear Strive script modding community

## Features

### BBScript language support

- Syntax highlighting for BBScript commands, values, states, labels, variables, and enums (Note: Warnings may appear when referencing sprites, states, or labels outside of the character)
- Command snippets and context-aware autocomplete
- Sprite-name autocomplete from the matching COL file
- Navigation from sprite references in `.bbs` files to their COL entries
- Shared COL resolution for main and EF scripts:
  - `XXX.bbs`
  - `XXXEF.bbs`
  - `COL_XXX.json`
- Formatting, reference checks, and editor diagnostics
- Project-level colors generated into `.vscode/settings.json`

### Asset workflow

The **BBScript: Workflow** Activity Bar view provides commands for common modding tasks:

- Select Project Folder
- Set Mod Folder
- Set Signature Source
- Select Chara Folder
- Extract + Parse
- Rebuild + Reinject
- Package
- Deploy (Put the generated package into the game's ~mods folder)
- Rebuild + Package (Rebuild + Reinject + Package)
- Full Deploy (Rebuild + Reinject + Package + Deploy)
- Reformat Files (Saves files to the uassets then reextracts to reset the formatting)

The extension uses the bundled Windows tools in `bin/win32-x64/` and the Rust helper source in `helper/`.

### Visual COL hitbox editor

- Open `COL_*.json` files in a custom editor
- Load sprite reference images from:

  ```SPRITE_REFERENCE_FOLDER/XXX/Collision/associatedimage.jpg
  ```
(Note: Reference images will not be provided)
- Named collision types from Hurtbox through ComboHitbox
- Customizable hitbox colors
- Select, add, remove, duplicate, copy, and paste boxes
- Copy and replace all boxes in a sprite
- Multi-select sprites and batch-edit shared boxes
- Drag boxes and resize edges or corners
- Whole-number and tenth-unit precision modes
- Symmetric resizing around the box center
- Sprite search, Preview controls, and keyboard shortcuts (Note: To see list of shortcuts, open the Col Editor and press alt + /)

## Requirements

- Windows x64
- Visual Studio Code 1.80.0 or newer
- A legally obtained copy of Guilty Gear Strive
- A Chara image directory is optional, but required for sprite backgrounds in the COL editor (Note: THIS WILL NEVER BE PROVIDED)

## Installation from VSIX

1. Download the latest `.vsix` release.
2. Open Visual Studio Code.
3. Open the Extensions view.
4. Select the `...` menu.
5. Choose **Install from VSIX...**.
6. Select the downloaded package.

## First-time setup

1. Open **BBScript: Workflow** from the Activity Bar.
2. Select **Select Project Folder**.
3. Choose the folder for your project, the extention will automatically populate it with the neccessary subfolders
4. Copy the folder from your FModel exports. The extention requires a folder layout of RED/Content/Chara/XXX/Common/Data/XXX_BBS.uasset (Note: This can be coppied directly from the FModel export folder. Delete any files you don't want to edit. You may add additional files at any point, but they will need to be extracted)
5. Configure the mod folder and sig source. (Mod folder refers to the ~mods folder that holds your mods for GGST. sig source can be found in GUILTY GEAR STRIVE\RED\Content\Paks\pakchunk0-WindowsNoEditor.sig)
6. Optionally select the Chara root used by the hitbox editor.
7. Run **Extract** to create editable files.

The selected project receives a `.vscode/settings.json` file containing the default BBScript text colors and hitbox colors. These can be edited freely

## Chara image layout

The selected Chara folder is the root:

```text
Chara/
└── XXX/
    └── Collision/
        ├── xxx210_00.jpg
        ├── xxx210_01.jpg
        └── xxx210_04.jpg
```

For `COL_XXX.json`, the editor searches `Chara/XXX/Collision/` for the selected entry's Associated Image value. Filename matching is case-insensitive.

## Hitbox types

| ID | Name |
|---:|---|
| 0 | Hurtbox |
| 1 | Hitbox |
| 2 | ExPoint |
| 3 | ExRect |
| 4 | ExVector |
| 5 | Push |
| 6 | TempCenter |
| 7 | Neck |
| 8 | Abdominal |
| 9 | SPGuard |
| 10 | RLeg |
| 11 | LLeg |
| 12 | Private0 |
| 13 | Private1 |
| 14 | Private2 |
| 15 | Private3 |
| 16 | ExtendJon |
| 17 | Unknown |
| 18 | ComboHitbox |

## Hitbox color customization

Colors are global Visual Studio Code settings and may be changed in Settings or `settings.json`:

```json
{
  "bbscript.hitboxColors.hurtbox": "#36d66b",
  "bbscript.hitboxColors.hitbox": "#ff3b4d",
  "bbscript.hitboxColors.comboHitbox": "#f5a623"
}
```

## COL editor controls

### Mouse

- Click a box to select it
- Repeated clicks cycle through overlapping boxes
- Drag an edge to resize one axis
- Drag a corner to resize both axes
- Hold `Shift` while dragging to move the box
- Hold `Ctrl` for tenth-unit precision
- Hold `Alt` while resizing to maintain the center
- Drag empty Preview space to pan
- Use the mouse wheel to zoom

### Keyboard

Press `Alt+/` in the COL editor for the complete shortcut list.

Common shortcuts:

```text
Alt+Up / Alt+Down       Previous / next sprite
Alt+Left / Alt+Right    Previous / next box
Alt+Insert              Create box
Alt+D                   Duplicate box
Alt+Delete              Delete box
Alt+C / Alt+V           Copy / paste box data
Alt+F                   Search sprites
Alt+Shift+F             Close other sprite dropdowns
Alt+R                   Reset Preview
Alt+I                   Image controls
Alt+M                   Toggle image mirroring
```

## Legal and content notice

This repository should not contain copyrighted game assets, extracted character files, or user-specific game data. Users are responsible for complying with applicable licenses and laws when using the conversion and deployment features.

The source and original documentation in this repository are licensed under Creative Commons Attribution 4.0 International. Bundled third-party components and executable tools may have separate licenses. Review `THIRD_PARTY_NOTICES.md` before redistribution.

## License

Creative Commons Attribution 4.0 International. See [LICENSE](LICENSE).

