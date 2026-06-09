# Installation Guide — Edit Helper Panel

## Requirements

- Adobe After Effects **2024** or later (CC 2024 / v24.x+)
- Windows or macOS

---

## Step 1 — Locate the ScriptUI Panels folder

### Windows
```
C:\Program Files\Adobe\Adobe After Effects 2024\Support Files\Scripts\ScriptUI Panels\
```

### macOS
```
/Applications/Adobe After Effects 2024/Scripts/ScriptUI Panels/
```

> **Tip:** If you have multiple versions of After Effects installed, make sure to use the correct version folder.

---

## Step 2 — Copy the script file

Copy **`EditHelperPanel.jsx`** into the `ScriptUI Panels` folder located in Step 1.

---

## Step 3 — Allow scripts to write files (recommended)

In After Effects, go to:

**Edit > Preferences > Scripting & Expressions** (Windows)  
**After Effects > Preferences > Scripting & Expressions** (macOS)

Enable:
- ✅ **Allow Scripts to Write Files and Access Network**

This ensures the panel can interact with the project without permission errors.

---

## Step 4 — Restart After Effects

Close and reopen After Effects completely so it detects the new script.

---

## Step 5 — Open the panel

Go to the menu:

**Window > Edit Helper Panel**

The panel will appear as a **dockable panel** — you can drag it next to your timeline, project panel, or anywhere in your workspace.

---

## Updating the script

To update to a newer version:

1. Close After Effects.
2. Replace `EditHelperPanel.jsx` in the `ScriptUI Panels` folder with the new version.
3. Reopen After Effects.

No additional steps are required — there is no installer.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Panel does not appear in the Window menu | Make sure the file is in the **ScriptUI Panels** folder (not the generic `Scripts` folder). |
| "Error: No active comp" alert | Open or click on a composition in the Project panel before using the panel. |
| Buttons do nothing | Check that **Allow Scripts to Write Files** is enabled in Preferences. |
| After Effects crashes on open | The `.jsx` file may be corrupted — re-download and replace it. |

---

## Uninstallation

Simply delete `EditHelperPanel.jsx` from the `ScriptUI Panels` folder and restart After Effects.
