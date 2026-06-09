/**
 * Edit Helper Panel v0.1
 * ScriptUI Panel for Adobe After Effects
 * Compatible with After Effects 2024+
 *
 * Place this file in: [AE Install]/Scripts/ScriptUI Panels/
 * Then open it via: Window > Edit Helper Panel
 */

// ============================================================
//  ENTRY POINT — supports both dockable panel and dialog
// ============================================================
(function EditHelperPanel(thisObj) {

    // --------------------------------------------------------
    //  UTILITY FUNCTIONS
    // --------------------------------------------------------

    /** Returns the active composition or null. */
    function getActiveComp() {
        return app.project.activeItem instanceof CompItem ? app.project.activeItem : null;
    }

    /**
     * Returns the active composition.
     * Alerts the user and throws if none is active.
     */
    function requireActiveComp() {
        var comp = getActiveComp();
        if (!comp) {
            alert("Edit Helper Panel\n\nNo active composition found.\nPlease open or select a composition first.");
            throw new Error("No active comp");
        }
        return comp;
    }

    /** Returns an array of currently selected layers in the given comp. */
    function getSelectedLayers(comp) {
        return comp.selectedLayers;
    }

    /**
     * Converts a frame count to seconds using the comp frame rate.
     * @param {number} frames
     * @param {CompItem} comp
     * @returns {number}
     */
    function framesToSeconds(frames, comp) {
        return frames / comp.frameRate;
    }

    /**
     * Returns a FolderItem with the given name from the root of the project,
     * creating it if it does not exist.
     * @param {string} name
     * @returns {FolderItem}
     */
    function createFolderIfMissing(name) {
        var items = app.project.items;
        for (var i = 1; i <= items.length; i++) {
            if (items[i] instanceof FolderItem && items[i].name === name) {
                return items[i];
            }
        }
        return app.project.items.addFolder(name);
    }

    /**
     * Returns a unique composition name by appending an incrementing suffix.
     * E.g. "EH_Precomp_01", "EH_Precomp_02", …
     * @param {string} baseName
     * @returns {string}
     */
    function getUniqueCompName(baseName) {
        var index = 1;
        var candidate = baseName;
        var items = app.project.items;
        while (true) {
            var found = false;
            for (var i = 1; i <= items.length; i++) {
                if (items[i].name === candidate) {
                    found = true;
                    break;
                }
            }
            if (!found) return candidate;
            index++;
            // Zero-pad to two digits: 01, 02, …
            candidate = baseName.replace(/\d+$/, "") + (index < 10 ? "0" + index : index);
        }
    }

    // --------------------------------------------------------
    //  FEATURE FUNCTIONS
    // --------------------------------------------------------

    /**
     * 1. CREATE ADJUSTMENT LAYER
     * Creates an adjustment layer above selected layers (or spanning the full
     * composition if nothing is selected).
     */
    function createAdjustmentLayer() {
        app.beginUndoGroup("EH: Create Adjustment Layer");
        try {
            var comp = requireActiveComp();
            var selected = getSelectedLayers(comp);

            // Determine the time range to cover
            var inPoint  = comp.workAreaStart;
            var duration = comp.workAreaDuration;

            if (selected.length > 0) {
                // Cover from earliest in-point to latest out-point of selection
                var earliest = selected[0].inPoint;
                var latest   = selected[0].outPoint;
                for (var i = 1; i < selected.length; i++) {
                    if (selected[i].inPoint  < earliest) earliest = selected[i].inPoint;
                    if (selected[i].outPoint > latest)   latest   = selected[i].outPoint;
                }
                inPoint  = earliest;
                duration = latest - earliest;
            }

            // Add solid (will be converted to adjustment layer)
            var adj = comp.layers.addSolid([0.5, 0.5, 0.5], "EH_Adjustment", comp.width, comp.height, comp.pixelAspect, duration);
            adj.adjustmentLayer = true;
            adj.inPoint = inPoint;
            adj.name    = "EH_Adjustment";

            // Move to top of layer stack
            adj.moveToBeginning();

        } catch (e) {
            if (e.message !== "No active comp") alert("EH Error: " + e.message);
        }
        app.endUndoGroup();
    }

    /**
     * 2 & 3. FLASH HELPER
     * Creates a white or black solid that fades from 100% to 0% over 6 frames.
     * @param {"white"|"black"} color
     */
    function createFlash(color) {
        var isWhite = (color === "white");
        app.beginUndoGroup("EH: " + (isWhite ? "White" : "Black") + " Flash");
        try {
            var comp      = requireActiveComp();
            var duration  = framesToSeconds(6, comp);
            var startTime = comp.time;
            var endTime   = startTime + duration;

            // Clamp end time within the composition
            if (endTime > comp.duration) endTime = comp.duration;

            var solidColor = isWhite ? [1, 1, 1] : [0, 0, 0];
            var layerName  = isWhite ? "EH_White_Flash" : "EH_Black_Flash";

            var flash = comp.layers.addSolid(solidColor, layerName, comp.width, comp.height, comp.pixelAspect, endTime - startTime);
            flash.inPoint = startTime;
            flash.name    = layerName;

            // Opacity keyframes: 100% at start → 0% at end
            var opacity = flash.property("Transform").property("Opacity");
            opacity.setValueAtTime(startTime, 100);
            opacity.setValueAtTime(endTime,   0);

            flash.moveToBeginning();

        } catch (e) {
            if (e.message !== "No active comp") alert("EH Error: " + e.message);
        }
        app.endUndoGroup();
    }

    /**
     * 4. IMPACT SHAKE
     * Applies a wiggle(18, 35) expression to the Position property of each
     * selected layer.
     */
    function impactShake() {
        app.beginUndoGroup("EH: Impact Shake");
        try {
            var comp     = requireActiveComp();
            var selected = getSelectedLayers(comp);

            if (selected.length === 0) {
                alert("Edit Helper Panel\n\nImpact Shake: Please select at least one layer.");
                app.endUndoGroup();
                return;
            }

            var expr = "wiggle(18, 35)";
            for (var i = 0; i < selected.length; i++) {
                var position = selected[i].property("Transform").property("Position");
                position.expression = expr;
            }

        } catch (e) {
            if (e.message !== "No active comp") alert("EH Error: " + e.message);
        }
        app.endUndoGroup();
    }

    /**
     * 5. SMOOTH ZOOM
     * Adds two Scale keyframes on each selected layer:
     *   - At current time  : current scale value
     *   - 12 frames later  : current scale + 15 %
     * Easy Ease is applied to both keyframes.
     */
    function smoothZoom() {
        app.beginUndoGroup("EH: Smooth Zoom");
        try {
            var comp     = requireActiveComp();
            var selected = getSelectedLayers(comp);

            if (selected.length === 0) {
                alert("Edit Helper Panel\n\nSmooth Zoom: Please select at least one layer.");
                app.endUndoGroup();
                return;
            }

            var t1 = comp.time;
            var t2 = t1 + framesToSeconds(12, comp);

            for (var i = 0; i < selected.length; i++) {
                var scale = selected[i].property("Transform").property("Scale");

                // Read current scale (before adding keyframes)
                var currentScale = scale.value; // [x, y] or [x, y, z]

                // Build zoomed scale (+15%)
                var zoomedScale = [];
                for (var j = 0; j < currentScale.length; j++) {
                    zoomedScale.push(currentScale[j] * 1.15);
                }

                scale.setValueAtTime(t1, currentScale);
                scale.setValueAtTime(t2, zoomedScale);

                // Apply Easy Ease on both keyframes
                // Keyframe indices are 1-based; the two we just added are the last two
                var numKeys = scale.numKeys;
                try {
                    scale.setTemporalEaseAtKey(numKeys - 1, [new KeyframeEase(0.5, 33.33)], [new KeyframeEase(0.5, 33.33)]);
                    scale.setTemporalEaseAtKey(numKeys,     [new KeyframeEase(0.5, 33.33)], [new KeyframeEase(0.5, 33.33)]);
                } catch (easeErr) {
                    // Easy Ease is cosmetic; ignore failure silently
                }
            }

        } catch (e) {
            if (e.message !== "No active comp") alert("EH Error: " + e.message);
        }
        app.endUndoGroup();
    }

    /**
     * 6. RGB SPLIT
     * Duplicates the first selected layer three times, renames them, and offsets
     * their positions to create a chromatic-aberration look.
     *
     * LIMITATION: True per-channel color isolation (showing only R, G, or B)
     * requires the "Shift Channels" or "Channel Mixer" effect combined with
     * Screen/Add blend modes.  This version applies the positional offset and
     * blend modes.  For production use, add "Shift Channels" manually to each
     * duplicate to isolate the appropriate channel.
     */
    function rgbSplit() {
        app.beginUndoGroup("EH: RGB Split");
        try {
            var comp     = requireActiveComp();
            var selected = getSelectedLayers(comp);

            if (selected.length === 0) {
                alert("Edit Helper Panel\n\nRGB Split: Please select at least one layer.");
                app.endUndoGroup();
                return;
            }

            var source = selected[0];

            // Helper: duplicate, rename, offset, set blend mode
            function makeDuplicate(name, dx, dy, blendMode) {
                var dup = source.duplicate();
                dup.name = name;

                var pos = dup.property("Transform").property("Position");
                var currentPos = pos.value;
                // Works for both 2D [x,y] and 3D [x,y,z]
                var newPos = [currentPos[0] + dx, currentPos[1] + dy];
                if (currentPos.length === 3) newPos.push(currentPos[2]);
                pos.setValue(newPos);

                dup.blendingMode = blendMode;
                return dup;
            }

            makeDuplicate("EH_RGB_Red",   4,  0, BlendingMode.SCREEN);
            makeDuplicate("EH_RGB_Green", -4, 0, BlendingMode.SCREEN);
            makeDuplicate("EH_RGB_Blue",  0,  4, BlendingMode.SCREEN);

        } catch (e) {
            if (e.message !== "No active comp") alert("EH Error: " + e.message);
        }
        app.endUndoGroup();
    }

    /**
     * 7. GLOW BOOST
     * Applies the native Glow effect to each selected layer with preset values.
     */
    function glowBoost() {
        app.beginUndoGroup("EH: Glow Boost");
        try {
            var comp     = requireActiveComp();
            var selected = getSelectedLayers(comp);

            if (selected.length === 0) {
                alert("Edit Helper Panel\n\nGlow Boost: Please select at least one layer.");
                app.endUndoGroup();
                return;
            }

            for (var i = 0; i < selected.length; i++) {
                var layer = selected[i];

                // "Glow" is located under Effect > Stylize > Glow
                var glow = layer.Effects.addProperty("ADBE Glow");

                // Glow Threshold (0–100 in UI → 0–1 internally)
                glow.property("ADBE Glow-0001").setValue(0.6);   // 60%
                // Glow Radius
                glow.property("ADBE Glow-0002").setValue(35);
                // Glow Intensity
                glow.property("ADBE Glow-0003").setValue(1.5);
            }

        } catch (e) {
            if (e.message !== "No active comp") alert("EH Error: " + e.message);
        }
        app.endUndoGroup();
    }

    /**
     * 8. AUTO PRECOMP SELECTED
     * Pre-composes selected layers under a unique EH_Precomp_XX name.
     */
    function autoPrecompSelected() {
        app.beginUndoGroup("EH: Auto Precomp Selected");
        try {
            var comp     = requireActiveComp();
            var selected = getSelectedLayers(comp);

            if (selected.length === 0) {
                alert("Edit Helper Panel\n\nAuto Precomp: Please select at least one layer.");
                app.endUndoGroup();
                return;
            }

            var newName = getUniqueCompName("EH_Precomp_01");

            // precomposeSelectedLayers(name, moveAllAttributes)
            comp.layers.precompose(
                // Build index array of selected layers (1-based)
                (function () {
                    var idxs = [];
                    for (var i = 0; i < selected.length; i++) {
                        idxs.push(selected[i].index);
                    }
                    return idxs;
                })(),
                newName,
                true  // move all attributes into new comp
            );

        } catch (e) {
            if (e.message !== "No active comp") alert("EH Error: " + e.message);
        }
        app.endUndoGroup();
    }

    /**
     * 9. ORGANIZE PROJECT
     * Creates the five standard folders and moves project items into them
     * based on their type.
     */
    function organizeProject() {
        app.beginUndoGroup("EH: Organize Project");
        try {
            var folders = {
                comps    : createFolderIfMissing("01_Comps"),
                footage  : createFolderIfMissing("02_Footage"),
                audio    : createFolderIfMissing("03_Audio"),
                precomps : createFolderIfMissing("04_Precomps"),
                solids   : createFolderIfMissing("05_Solids")
            };

            // Collect items first (moving changes indices)
            var items = [];
            for (var i = 1; i <= app.project.items.length; i++) {
                items.push(app.project.items[i]);
            }

            for (var j = 0; j < items.length; j++) {
                var item = items[j];

                // Skip the folders themselves
                if (item instanceof FolderItem) continue;

                if (item instanceof CompItem) {
                    var isPrecomp = (item.name.toLowerCase().indexOf("precomp") !== -1) ||
                                    (item.name.indexOf("EH_Precomp") !== -1);
                    item.parentFolder = isPrecomp ? folders.precomps : folders.comps;

                } else if (item instanceof FootageItem) {
                    if (item.mainSource instanceof SolidSource) {
                        item.parentFolder = folders.solids;
                    } else if (item.mainSource instanceof FileSource) {
                        // Detect audio by file extension
                        var name = item.name.toLowerCase();
                        var isAudio = (name.match(/\.(mp3|wav|aac|aif|aiff|m4a|ogg|flac)$/) !== null);
                        item.parentFolder = isAudio ? folders.audio : folders.footage;
                    }
                }
            }

            alert("Edit Helper Panel\n\nProject organized successfully.");

        } catch (e) {
            alert("EH Error: " + e.message);
        }
        app.endUndoGroup();
    }

    // --------------------------------------------------------
    //  UI BUILDER
    // --------------------------------------------------------

    function buildUI(thisObj) {
        // Create either a dockable panel (when opened from ScriptUI Panels menu)
        // or a floating palette (when run directly from the script editor).
        var panel = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "Edit Helper Panel", undefined, { resizeable: true });

        panel.text     = "Edit Helper Panel";
        panel.orientation = "column";
        panel.alignChildren = ["fill", "top"];
        panel.spacing  = 8;
        panel.margins  = 10;

        // ---- Helper to add a section header ----
        function addSection(parent, title) {
            var grp = parent.add("group");
            grp.orientation  = "column";
            grp.alignChildren = ["fill", "top"];
            grp.spacing = 4;

            var header = grp.add("statictext", undefined, "— " + title + " —");
            header.alignment = ["center", "center"];
            return grp;
        }

        // ---- Helper to add a styled button ----
        function addButton(parent, label, tooltip, callback) {
            var btn = parent.add("button", undefined, label);
            btn.helpTip = tooltip;
            btn.onClick = callback;
            return btn;
        }

        // ---- LAYERS section ----
        var secLayers = addSection(panel, "LAYERS");

        addButton(secLayers, "Create Adjustment Layer",
            "Creates an EH_Adjustment layer above selected layers (or spanning the full comp).",
            createAdjustmentLayer);

        addButton(secLayers, "White Flash",
            "Creates a 6-frame white flash starting at the current time.",
            function () { createFlash("white"); });

        addButton(secLayers, "Black Flash",
            "Creates a 6-frame black flash starting at the current time.",
            function () { createFlash("black"); });

        // ---- MOTION section ----
        var secMotion = addSection(panel, "MOTION");

        addButton(secMotion, "Impact Shake",
            "Applies wiggle(18, 35) to the Position of selected layers.",
            impactShake);

        addButton(secMotion, "Smooth Zoom",
            "Adds a +15% scale zoom over 12 frames on selected layers.",
            smoothZoom);

        // ---- EFFECTS section ----
        var secEffects = addSection(panel, "EFFECTS");

        addButton(secEffects, "RGB Split",
            "Duplicates the selected layer 3× with position offsets (Red/Green/Blue).",
            rgbSplit);

        addButton(secEffects, "Glow Boost",
            "Applies native Glow effect (Threshold 60, Radius 35, Intensity 1.5) to selected layers.",
            glowBoost);

        // ---- PROJECT section ----
        var secProject = addSection(panel, "PROJECT");

        addButton(secProject, "Auto Precomp Selected",
            "Pre-composes selected layers into EH_Precomp_01 (auto-increments).",
            autoPrecompSelected);

        addButton(secProject, "Organize Project",
            "Creates standard folders and sorts all project items by type.",
            organizeProject);

        // ---- Footer ----
        panel.add("panel"); // horizontal divider

        var footer = panel.add("statictext", undefined, "Edit Helper Panel v0.1");
        footer.alignment = ["center", "center"];

        // Layout & show for floating palette mode
        if (panel instanceof Window) {
            panel.center();
            panel.show();
        } else {
            panel.layout.layout(true);
        }

        return panel;
    }

    // --------------------------------------------------------
    //  LAUNCH
    // --------------------------------------------------------
    buildUI(thisObj);

}(this));
