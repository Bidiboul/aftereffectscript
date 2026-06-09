/**
 * Edit Helper Panel v0.2
 * ScriptUI Panel for Adobe After Effects (2024+)
 *
 * Place this file in: [AE Install]/Scripts/ScriptUI Panels/
 * Then open it via: Window > Edit Helper Panel
 *
 * NOTE ON ICONS: ScriptUI cannot load SVG files directly. Icons are drawn
 * as vector shapes with the ScriptUI graphics API (onDraw), which gives a
 * crisp, theme-aware result equivalent to inline SVG.
 */

(function EditHelperPanel(thisObj) {

    var SCRIPT_NAME    = "Edit Helper Panel";
    var SCRIPT_VERSION = "0.2";
    var SETTINGS_KEY   = "EditHelperPanel";

    // ============================================================
    //  SETTINGS (persisted via app.settings)
    // ============================================================

    var DEFAULTS = {
        theme       : "dark",     // "dark" | "light"
        accent      : "#7C5CFF",  // accent color (hex)
        zoomAmount  : 15,         // % scale change for smooth zooms
        zoomFrames  : 12,         // duration of zooms in frames
        licenseKey  : ""          // stored license key
    };

    function loadSetting(key) {
        try {
            if (app.settings.haveSetting(SETTINGS_KEY, key)) {
                return app.settings.getSetting(SETTINGS_KEY, key);
            }
        } catch (e) {}
        return String(DEFAULTS[key]);
    }

    function saveSetting(key, value) {
        try { app.settings.saveSetting(SETTINGS_KEY, key, String(value)); } catch (e) {}
    }

    var settings = {
        theme      : loadSetting("theme"),
        accent     : loadSetting("accent"),
        zoomAmount : parseFloat(loadSetting("zoomAmount")),
        zoomFrames : parseInt(loadSetting("zoomFrames"), 10),
        licenseKey : loadSetting("licenseKey")
    };

    // ============================================================
    //  THEME
    // ============================================================

    var THEMES = {
        dark: {
            bg        : [0.13, 0.13, 0.15],
            panel     : [0.17, 0.17, 0.20],
            text      : [0.92, 0.92, 0.95],
            subtext   : [0.60, 0.60, 0.66],
            btnHover  : [0.26, 0.26, 0.31]
        },
        light: {
            bg        : [0.93, 0.93, 0.95],
            panel     : [0.88, 0.88, 0.91],
            text      : [0.12, 0.12, 0.15],
            subtext   : [0.40, 0.40, 0.46],
            btnHover  : [0.80, 0.80, 0.85]
        }
    };

    /** Converts "#RRGGBB" to [r,g,b] floats 0–1. */
    function hexToRgb(hex) {
        hex = hex.replace("#", "");
        return [
            parseInt(hex.substring(0, 2), 16) / 255,
            parseInt(hex.substring(2, 4), 16) / 255,
            parseInt(hex.substring(4, 6), 16) / 255
        ];
    }

    function theme()  { return THEMES[settings.theme] || THEMES.dark; }
    function accent() { return hexToRgb(settings.accent); }

    var ACCENT_PRESETS = [
        { name: "Violet", hex: "#7C5CFF" },
        { name: "Cyan",   hex: "#2FD3E0" },
        { name: "Rose",   hex: "#FF4D7D" },
        { name: "Lime",   hex: "#9BE15D" },
        { name: "Orange", hex: "#FF9040" },
        { name: "Rouge Valorant", hex: "#FF4655" }
    ];

    // ============================================================
    //  LICENSE SYSTEM (offline key validation)
    // ============================================================
    //  Key format : EHP-XXXX-XXXX-CCCC
    //  The last group is a checksum: sum of char codes of the first
    //  8 payload chars, mod 9973, in base-36 uppercase, padded to 4.
    //  Generate keys with the same algorithm on the seller side.
    // ============================================================

    function computeChecksum(payload) {
        var sum = 0;
        for (var i = 0; i < payload.length; i++) {
            sum += payload.charCodeAt(i) * (i + 7);
        }
        var c = (sum % 9973).toString(36).toUpperCase();
        while (c.length < 4) c = "0" + c;
        return c;
    }

    function validateLicenseKey(key) {
        key = key.toUpperCase().replace(/\s/g, "");
        var m = key.match(/^EHP-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/);
        if (!m) return false;
        return computeChecksum(m[1] + m[2]) === m[3];
    }

    function isLicensed() {
        return validateLicenseKey(settings.licenseKey);
    }

    // ============================================================
    //  UTILITY FUNCTIONS
    // ============================================================

    function getActiveComp() {
        return app.project.activeItem instanceof CompItem ? app.project.activeItem : null;
    }

    function requireActiveComp() {
        var comp = getActiveComp();
        if (!comp) {
            alert(SCRIPT_NAME + "\n\nNo active composition found.\nPlease open or select a composition first.");
            throw new Error("No active comp");
        }
        return comp;
    }

    function getSelectedLayers(comp) {
        return comp.selectedLayers;
    }

    function framesToSeconds(frames, comp) {
        return frames / comp.frameRate;
    }

    function createFolderIfMissing(name) {
        var items = app.project.items;
        for (var i = 1; i <= items.length; i++) {
            if (items[i] instanceof FolderItem && items[i].name === name) return items[i];
        }
        return app.project.items.addFolder(name);
    }

    function getUniqueCompName(baseName) {
        var index = 1;
        var candidate = baseName;
        var items = app.project.items;
        while (true) {
            var found = false;
            for (var i = 1; i <= items.length; i++) {
                if (items[i].name === candidate) { found = true; break; }
            }
            if (!found) return candidate;
            index++;
            candidate = baseName.replace(/\d+$/, "") + (index < 10 ? "0" + index : index);
        }
    }

    /** Applies Easy Ease to the last `count` keyframes of a property. */
    function easeLastKeys(prop, count) {
        try {
            var ease = [new KeyframeEase(0.5, 33.33)];
            var dims = prop.value instanceof Array ? prop.value.length : 1;
            var eases = [];
            for (var d = 0; d < dims; d++) eases.push(ease[0]);
            for (var k = prop.numKeys - count + 1; k <= prop.numKeys; k++) {
                prop.setTemporalEaseAtKey(k, eases, eases);
            }
        } catch (e) { /* easing is cosmetic — ignore failures */ }
    }

    /** Runs fn inside an undo group, swallowing the requireActiveComp throw. */
    function withUndo(label, fn) {
        app.beginUndoGroup("EH: " + label);
        try { fn(); }
        catch (e) { if (e.message !== "No active comp") alert("EH Error: " + e.message); }
        app.endUndoGroup();
    }

    /** Alerts and returns false if no layer is selected. */
    function requireSelection(comp, featureName) {
        if (getSelectedLayers(comp).length === 0) {
            alert(SCRIPT_NAME + "\n\n" + featureName + ": please select at least one layer.");
            return false;
        }
        return true;
    }

    // ============================================================
    //  FEATURES — LAYERS
    // ============================================================

    function createAdjustmentLayer() {
        withUndo("Create Adjustment Layer", function () {
            var comp = requireActiveComp();
            var selected = getSelectedLayers(comp);

            var inPoint  = comp.workAreaStart;
            var duration = comp.workAreaDuration;

            if (selected.length > 0) {
                var earliest = selected[0].inPoint, latest = selected[0].outPoint;
                for (var i = 1; i < selected.length; i++) {
                    if (selected[i].inPoint  < earliest) earliest = selected[i].inPoint;
                    if (selected[i].outPoint > latest)   latest   = selected[i].outPoint;
                }
                inPoint  = earliest;
                duration = latest - earliest;
            }

            var adj = comp.layers.addSolid([0.5, 0.5, 0.5], "EH_Adjustment",
                comp.width, comp.height, comp.pixelAspect, duration);
            adj.adjustmentLayer = true;
            adj.inPoint = inPoint;
            adj.name = "EH_Adjustment";
            adj.moveToBeginning();
        });
    }

    function createFlash(color) {
        var isWhite = (color === "white");
        withUndo((isWhite ? "White" : "Black") + " Flash", function () {
            var comp = requireActiveComp();
            var startTime = comp.time;
            var endTime = Math.min(startTime + framesToSeconds(6, comp), comp.duration);

            var flash = comp.layers.addSolid(isWhite ? [1, 1, 1] : [0, 0, 0],
                isWhite ? "EH_White_Flash" : "EH_Black_Flash",
                comp.width, comp.height, comp.pixelAspect, endTime - startTime);
            flash.inPoint = startTime;
            flash.name = isWhite ? "EH_White_Flash" : "EH_Black_Flash";

            var opacity = flash.property("Transform").property("Opacity");
            opacity.setValueAtTime(startTime, 100);
            opacity.setValueAtTime(endTime, 0);
            flash.moveToBeginning();
        });
    }

    // ============================================================
    //  FEATURES — MOTION / ZOOMS
    // ============================================================

    /**
     * Generic smooth zoom.
     * @param {"in"|"out"|"outin"|"inout"} mode
     *   in    : scale → scale + amount
     *   out   : scale → scale − amount
     *   outin : scale → scale − amount → back to scale (punch out-in)
     *   inout : scale → scale + amount → back to scale (punch in-out)
     */
    function smoothZoom(mode) {
        withUndo("Smooth Zoom " + mode, function () {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Smooth Zoom")) return;

            var amount = settings.zoomAmount / 100;
            var half   = framesToSeconds(settings.zoomFrames, comp);
            var t1 = comp.time, t2 = t1 + half, t3 = t2 + half;
            var selected = getSelectedLayers(comp);

            for (var i = 0; i < selected.length; i++) {
                var scale = selected[i].property("Transform").property("Scale");
                var base = scale.value;

                function scaled(factor) {
                    var v = [];
                    for (var j = 0; j < base.length; j++) v.push(base[j] * factor);
                    return v;
                }

                if (mode === "in") {
                    scale.setValueAtTime(t1, base);
                    scale.setValueAtTime(t2, scaled(1 + amount));
                    easeLastKeys(scale, 2);
                } else if (mode === "out") {
                    scale.setValueAtTime(t1, base);
                    scale.setValueAtTime(t2, scaled(1 - amount));
                    easeLastKeys(scale, 2);
                } else if (mode === "outin") {
                    scale.setValueAtTime(t1, base);
                    scale.setValueAtTime(t2, scaled(1 - amount));
                    scale.setValueAtTime(t3, base);
                    easeLastKeys(scale, 3);
                } else { // inout
                    scale.setValueAtTime(t1, base);
                    scale.setValueAtTime(t2, scaled(1 + amount));
                    scale.setValueAtTime(t3, base);
                    easeLastKeys(scale, 3);
                }
            }
        });
    }

    /** Legacy wiggle expression on selected layers' Position. */
    function impactShake() {
        withUndo("Impact Shake", function () {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Impact Shake")) return;
            var selected = getSelectedLayers(comp);
            for (var i = 0; i < selected.length; i++) {
                selected[i].property("Transform").property("Position").expression = "wiggle(18, 35)";
            }
        });
    }

    /**
     * QUICK SHAKE — non-destructive shake on a dedicated adjustment layer.
     * Creates an adjustment layer with the native Transform effect and a
     * wiggle expression on its Position, lasting `durationFrames` from the
     * current time. The footage below is never touched.
     * @param {number} freq  wiggle frequency
     * @param {number} amp   wiggle amplitude (px)
     * @param {string} label suffix for the layer name
     */
    function quickShake(freq, amp, label) {
        withUndo("Quick Shake " + label, function () {
            var comp = requireActiveComp();
            var durationFrames = 10;
            var start = comp.time;
            var end = Math.min(start + framesToSeconds(durationFrames, comp), comp.duration);

            var adj = comp.layers.addSolid([0.5, 0.5, 0.5], "EH_Shake_" + label,
                comp.width, comp.height, comp.pixelAspect, end - start);
            adj.adjustmentLayer = true;
            adj.inPoint = start;
            adj.name = "EH_Shake_" + label;
            adj.moveToBeginning();

            // Native Transform effect — shake via its own Position so the
            // layer transform stays clean.
            var fx = adj.Effects.addProperty("ADBE Geometry2");
            // Slight scale-up so shaking never reveals comp edges
            fx.property("ADBE Geometry2-0004").setValue(false); // uniform scale off-switch safety
            try { fx.property("ADBE Geometry2-0005").setValue(100 + amp / 8); } catch (e) {} // Scale Height
            try { fx.property("ADBE Geometry2-0006").setValue(100 + amp / 8); } catch (e) {} // Scale Width
            fx.property("ADBE Geometry2-0002").expression = "wiggle(" + freq + ", " + amp + ")";
        });
    }

    /**
     * FREEZE FRAME — splits the selected layer at the current time:
     * the original keeps playing until now, a frozen duplicate (time-remapped
     * hold) takes over afterwards.
     */
    function freezeFrame() {
        withUndo("Freeze Frame", function () {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Freeze Frame")) return;

            var selected = getSelectedLayers(comp).slice(0); // copy — selection changes on duplicate
            var t = comp.time;

            for (var i = 0; i < selected.length; i++) {
                var layer = selected[i];
                if (t <= layer.inPoint || t >= layer.outPoint) {
                    alert(SCRIPT_NAME + "\n\nFreeze Frame: place the playhead inside layer \"" + layer.name + "\".");
                    continue;
                }

                var frozen = layer.duplicate();
                frozen.name = layer.name + "_FREEZE";

                // Original plays up to the freeze point
                layer.outPoint = t;

                // Duplicate holds the frame from the freeze point onward
                frozen.timeRemapEnabled = true;
                var tr = frozen.property("ADBE Time Remapping");
                tr.setValueAtTime(t, tr.valueAtTime(t, false));
                // Hold interpolation so the frame never moves
                for (var k = 1; k <= tr.numKeys; k++) {
                    tr.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD);
                }
                frozen.inPoint = t;
                frozen.outPoint = comp.duration;
            }
        });
    }

    /**
     * SPEED LINES — anime-style radial speed lines overlay using only
     * native effects: Fractal Noise (stretched) + Polar Coordinates,
     * Screen blend mode, animated evolution.
     */
    function speedLines() {
        withUndo("Speed Lines", function () {
            var comp = requireActiveComp();
            var start = comp.time;
            var end = Math.min(start + 2, comp.duration); // 2 s by default, trim as needed

            var solid = comp.layers.addSolid([1, 1, 1], "EH_Speed_Lines",
                comp.width, comp.height, comp.pixelAspect, end - start);
            solid.inPoint = start;
            solid.name = "EH_Speed_Lines";
            solid.blendingMode = BlendingMode.SCREEN;
            solid.moveToBeginning();

            // Fractal Noise stretched horizontally → streaks
            var noise = solid.Effects.addProperty("ADBE Fractal Noise");
            noise.property("ADBE Fractal Noise-0001").setValue(1);    // Fractal Type: Basic
            noise.property("ADBE Fractal Noise-0003").setValue(600);  // Contrast
            noise.property("ADBE Fractal Noise-0004").setValue(-90);  // Brightness
            // Transform subgroup: disable uniform scaling, stretch width
            noise.property("ADBE Fractal Noise-0007").setValue(false); // Uniform Scaling
            noise.property("ADBE Fractal Noise-0009").setValue(2000);  // Scale Width
            noise.property("ADBE Fractal Noise-0010").setValue(15);    // Scale Height
            // Animated evolution for movement
            noise.property("ADBE Fractal Noise-0014").expression = "time * 4000";

            // Polar Coordinates: rect → polar turns streaks into radial lines
            var polar = solid.Effects.addProperty("ADBE Polar Coordinates");
            polar.property("ADBE Polar Coordinates-0001").setValue(1);   // Interpolation 100%
            polar.property("ADBE Polar Coordinates-0002").setValue(2);   // Rect to Polar
        });
    }

    // ============================================================
    //  FEATURES — EFFECTS
    // ============================================================

    /**
     * RGB SPLIT v2 — true channel isolation.
     * Duplicates the selected layer 3×, uses native Shift Channels to keep
     * only one channel per duplicate, offsets each copy and blends with Add.
     */
    function rgbSplit() {
        withUndo("RGB Split", function () {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "RGB Split")) return;

            var source = getSelectedLayers(comp)[0];

            // channel: 1 = Red, 2 = Green, 3 = Blue (Shift Channels popup:
            // value meanings — 2=Red, 3=Green, 4=Blue, 9=Full Off)
            function makeChannelDup(name, dx, dy, redV, greenV, blueV) {
                var dup = source.duplicate();
                dup.name = name;

                var pos = dup.property("Transform").property("Position");
                var p = pos.value;
                var np = [p[0] + dx, p[1] + dy];
                if (p.length === 3) np.push(p[2]);
                pos.setValue(np);

                var sc = dup.Effects.addProperty("ADBE Shift Channels");
                sc.property("ADBE Shift Channels-0002").setValue(redV);   // Take Red From
                sc.property("ADBE Shift Channels-0003").setValue(greenV); // Take Green From
                sc.property("ADBE Shift Channels-0004").setValue(blueV);  // Take Blue From

                dup.blendingMode = BlendingMode.ADD;
                return dup;
            }

            // 10 = Full Off in the Shift Channels dropdown
            var OFF = 10, R = 2, G = 3, B = 4;
            makeChannelDup("EH_RGB_Blue",  0,  4, OFF, OFF, B);
            makeChannelDup("EH_RGB_Green", -4, 0, OFF, G, OFF);
            makeChannelDup("EH_RGB_Red",   4,  0, R, OFF, OFF);

            // Hide the source so only the three channel copies are visible
            source.enabled = false;
        });
    }

    function glowBoost() {
        withUndo("Glow Boost", function () {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Glow Boost")) return;
            var selected = getSelectedLayers(comp);
            for (var i = 0; i < selected.length; i++) {
                var glow = selected[i].Effects.addProperty("ADBE Glow");
                glow.property("ADBE Glow-0001").setValue(0.6); // Threshold 60%
                glow.property("ADBE Glow-0002").setValue(35);  // Radius
                glow.property("ADBE Glow-0003").setValue(1.5); // Intensity
            }
        });
    }

    // ============================================================
    //  FEATURES — PROJECT
    // ============================================================

    function autoPrecompSelected() {
        withUndo("Auto Precomp Selected", function () {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Auto Precomp")) return;
            var selected = getSelectedLayers(comp);
            var idxs = [];
            for (var i = 0; i < selected.length; i++) idxs.push(selected[i].index);
            comp.layers.precompose(idxs, getUniqueCompName("EH_Precomp_01"), true);
        });
    }

    function organizeProject() {
        withUndo("Organize Project", function () {
            var folders = {
                comps    : createFolderIfMissing("01_Comps"),
                footage  : createFolderIfMissing("02_Footage"),
                audio    : createFolderIfMissing("03_Audio"),
                precomps : createFolderIfMissing("04_Precomps"),
                solids   : createFolderIfMissing("05_Solids")
            };

            var items = [];
            for (var i = 1; i <= app.project.items.length; i++) items.push(app.project.items[i]);

            for (var j = 0; j < items.length; j++) {
                var item = items[j];
                if (item instanceof FolderItem) continue;

                if (item instanceof CompItem) {
                    var isPre = item.name.toLowerCase().indexOf("precomp") !== -1;
                    item.parentFolder = isPre ? folders.precomps : folders.comps;
                } else if (item instanceof FootageItem) {
                    if (item.mainSource instanceof SolidSource) {
                        item.parentFolder = folders.solids;
                    } else if (item.mainSource instanceof FileSource) {
                        var isAudio = item.name.toLowerCase().match(/\.(mp3|wav|aac|aif|aiff|m4a|ogg|flac)$/) !== null;
                        item.parentFolder = isAudio ? folders.audio : folders.footage;
                    }
                }
            }
            alert(SCRIPT_NAME + "\n\nProject organized successfully.");
        });
    }

    // ============================================================
    //  ICON DRAWING (vector, theme-aware — SVG-equivalent)
    //  Each icon is a function(gfx, pen, brush, s) drawing in an s×s box.
    // ============================================================

    var ICONS = {
        adjustment: function (g, x, y, s, pen) { // half-filled circle
            g.newPath(); g.ellipsePath(x, y, s, s); g.strokePath(pen);
            g.newPath(); g.moveTo(x + s / 2, y); g.lineTo(x + s / 2, y + s); g.strokePath(pen);
        },
        flash: function (g, x, y, s, pen) { // lightning bolt
            g.newPath();
            g.moveTo(x + s * 0.6, y);
            g.lineTo(x + s * 0.2, y + s * 0.55);
            g.lineTo(x + s * 0.5, y + s * 0.55);
            g.lineTo(x + s * 0.4, y + s);
            g.lineTo(x + s * 0.8, y + s * 0.4);
            g.lineTo(x + s * 0.5, y + s * 0.4);
            g.closePath();
            g.strokePath(pen);
        },
        shake: function (g, x, y, s, pen) { // zigzag
            g.newPath();
            g.moveTo(x, y + s * 0.5);
            g.lineTo(x + s * 0.25, y + s * 0.15);
            g.lineTo(x + s * 0.5, y + s * 0.85);
            g.lineTo(x + s * 0.75, y + s * 0.15);
            g.lineTo(x + s, y + s * 0.5);
            g.strokePath(pen);
        },
        zoomIn: function (g, x, y, s, pen) { // magnifier with +
            g.newPath(); g.ellipsePath(x, y, s * 0.7, s * 0.7); g.strokePath(pen);
            g.newPath(); g.moveTo(x + s * 0.6, y + s * 0.6); g.lineTo(x + s, y + s); g.strokePath(pen);
            g.newPath(); g.moveTo(x + s * 0.2, y + s * 0.35); g.lineTo(x + s * 0.5, y + s * 0.35); g.strokePath(pen);
            g.newPath(); g.moveTo(x + s * 0.35, y + s * 0.2); g.lineTo(x + s * 0.35, y + s * 0.5); g.strokePath(pen);
        },
        zoomOut: function (g, x, y, s, pen) { // magnifier with −
            g.newPath(); g.ellipsePath(x, y, s * 0.7, s * 0.7); g.strokePath(pen);
            g.newPath(); g.moveTo(x + s * 0.6, y + s * 0.6); g.lineTo(x + s, y + s); g.strokePath(pen);
            g.newPath(); g.moveTo(x + s * 0.2, y + s * 0.35); g.lineTo(x + s * 0.5, y + s * 0.35); g.strokePath(pen);
        },
        punch: function (g, x, y, s, pen) { // double arrows out-in
            g.newPath();
            g.moveTo(x, y + s * 0.5); g.lineTo(x + s * 0.35, y + s * 0.5);
            g.moveTo(x + s * 0.25, y + s * 0.3); g.lineTo(x + s * 0.35, y + s * 0.5); g.lineTo(x + s * 0.25, y + s * 0.7);
            g.moveTo(x + s, y + s * 0.5); g.lineTo(x + s * 0.65, y + s * 0.5);
            g.moveTo(x + s * 0.75, y + s * 0.3); g.lineTo(x + s * 0.65, y + s * 0.5); g.lineTo(x + s * 0.75, y + s * 0.7);
            g.strokePath(pen);
        },
        rgb: function (g, x, y, s, pen) { // three overlapping circles
            g.newPath(); g.ellipsePath(x, y + s * 0.15, s * 0.6, s * 0.6); g.strokePath(pen);
            g.newPath(); g.ellipsePath(x + s * 0.4, y + s * 0.15, s * 0.6, s * 0.6); g.strokePath(pen);
            g.newPath(); g.ellipsePath(x + s * 0.2, y + s * 0.4, s * 0.6, s * 0.6); g.strokePath(pen);
        },
        glow: function (g, x, y, s, pen) { // sun
            g.newPath(); g.ellipsePath(x + s * 0.25, y + s * 0.25, s * 0.5, s * 0.5); g.strokePath(pen);
            var c = [[0.5, 0, 0.5, 0.15], [0.5, 0.85, 0.5, 1], [0, 0.5, 0.15, 0.5], [0.85, 0.5, 1, 0.5]];
            for (var i = 0; i < c.length; i++) {
                g.newPath();
                g.moveTo(x + s * c[i][0], y + s * c[i][1]);
                g.lineTo(x + s * c[i][2], y + s * c[i][3]);
                g.strokePath(pen);
            }
        },
        freeze: function (g, x, y, s, pen) { // pause bars in frame
            g.newPath(); g.rectPath(x, y, s, s); g.strokePath(pen);
            g.newPath(); g.moveTo(x + s * 0.35, y + s * 0.25); g.lineTo(x + s * 0.35, y + s * 0.75); g.strokePath(pen);
            g.newPath(); g.moveTo(x + s * 0.65, y + s * 0.25); g.lineTo(x + s * 0.65, y + s * 0.75); g.strokePath(pen);
        },
        lines: function (g, x, y, s, pen) { // radial speed lines
            var c = [[0, 0], [s, 0], [0, s], [s, s], [s * 0.5, 0], [0, s * 0.5], [s, s * 0.5], [s * 0.5, s]];
            for (var i = 0; i < c.length; i++) {
                g.newPath();
                var mx = x + s * 0.5 + (c[i][0] - s * 0.5) * 0.45;
                var my = y + s * 0.5 + (c[i][1] - s * 0.5) * 0.45;
                g.moveTo(mx, my); g.lineTo(x + c[i][0], y + c[i][1]);
                g.strokePath(pen);
            }
        },
        precomp: function (g, x, y, s, pen) { // nested boxes
            g.newPath(); g.rectPath(x, y + s * 0.2, s * 0.8, s * 0.8); g.strokePath(pen);
            g.newPath(); g.rectPath(x + s * 0.2, y, s * 0.8, s * 0.8); g.strokePath(pen);
        },
        folder: function (g, x, y, s, pen) { // folder
            g.newPath();
            g.moveTo(x, y + s * 0.25);
            g.lineTo(x + s * 0.35, y + s * 0.25);
            g.lineTo(x + s * 0.45, y + s * 0.4);
            g.lineTo(x + s, y + s * 0.4);
            g.lineTo(x + s, y + s);
            g.lineTo(x, y + s);
            g.closePath();
            g.strokePath(pen);
        },
        gear: function (g, x, y, s, pen) { // settings gear (simplified)
            g.newPath(); g.ellipsePath(x + s * 0.25, y + s * 0.25, s * 0.5, s * 0.5); g.strokePath(pen);
            var t = [[0.5, 0, 0.5, 0.2], [0.5, 0.8, 0.5, 1], [0, 0.5, 0.2, 0.5], [0.8, 0.5, 1, 0.5]];
            for (var i = 0; i < t.length; i++) {
                g.newPath();
                g.moveTo(x + s * t[i][0], y + s * t[i][1]);
                g.lineTo(x + s * t[i][2], y + s * t[i][3]);
                g.strokePath(pen);
            }
        }
    };

    // ============================================================
    //  CUSTOM UI WIDGETS (flat themed buttons)
    // ============================================================

    var allButtons = [];   // for re-theming
    var allHeaders = [];

    /**
     * Creates a flat, theme-aware icon button (drawn with the graphics API).
     */
    function iconButton(parent, label, iconName, tooltip, onClick) {
        var btn = parent.add("group");
        btn.preferredSize = [220, 28];
        btn.minimumSize   = [160, 28];
        btn.alignment     = ["fill", "top"];
        btn.helpTip       = tooltip;
        btn._label  = label;
        btn._icon   = iconName;
        btn._hover  = false;
        btn._down   = false;

        btn.onDraw = function () {
            var g  = this.graphics;
            var th = theme();
            var w  = this.size[0], h = this.size[1];

            // Background
            var bgCol = this._down ? accent() : (this._hover ? th.btnHover : th.panel);
            g.newPath(); g.rectPath(0, 0, w, h);
            g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, [bgCol[0], bgCol[1], bgCol[2], 1]));

            // Accent strip on the left
            var ac = accent();
            g.newPath(); g.rectPath(0, 0, 3, h);
            g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, [ac[0], ac[1], ac[2], 1]));

            // Icon
            var iconCol = this._down ? [1, 1, 1] : ac;
            var pen = g.newPen(g.PenType.SOLID_COLOR, [iconCol[0], iconCol[1], iconCol[2], 1], 1.6);
            var iconSize = 13, ix = 12, iy = (h - iconSize) / 2;
            if (ICONS[this._icon]) ICONS[this._icon](g, ix, iy, iconSize, pen);

            // Label
            var txtCol = this._down ? [1, 1, 1] : th.text;
            g.newPath();
            var font = ScriptUI.newFont("Tahoma", ScriptUI.FontStyle.REGULAR, 12);
            g.drawString(this._label,
                g.newPen(g.PenType.SOLID_COLOR, [txtCol[0], txtCol[1], txtCol[2], 1], 1),
                36, (h - 14) / 2, font);
        };

        btn.addEventListener("mouseover", function () { this._hover = true;  this.notify("onDraw"); });
        btn.addEventListener("mouseout",  function () { this._hover = false; this._down = false; this.notify("onDraw"); });
        btn.addEventListener("mousedown", function () { this._down = true;   this.notify("onDraw"); });
        btn.addEventListener("mouseup",   function () {
            if (this._down) { this._down = false; this.notify("onDraw"); onClick(); }
        });

        allButtons.push(btn);
        return btn;
    }

    /** Section header with accent-colored title. */
    function sectionHeader(parent, title) {
        var grp = parent.add("group");
        grp.alignment = ["fill", "top"];
        grp.preferredSize = [220, 18];
        grp._title = title;
        grp.onDraw = function () {
            var g = this.graphics;
            var ac = accent(), th = theme();
            var font = ScriptUI.newFont("Tahoma", ScriptUI.FontStyle.BOLD, 11);
            g.drawString(this._title,
                g.newPen(g.PenType.SOLID_COLOR, [ac[0], ac[1], ac[2], 1], 1), 0, 2, font);
            // underline
            g.newPath(); g.moveTo(0, 16); g.lineTo(this.size[0], 16);
            g.strokePath(g.newPen(g.PenType.SOLID_COLOR, [th.subtext[0], th.subtext[1], th.subtext[2], 0.5], 1));
        };
        allHeaders.push(grp);
        return grp;
    }

    // ============================================================
    //  SETTINGS / CUSTOMIZATION DIALOG
    // ============================================================

    function openSettingsDialog(mainPanel) {
        var dlg = new Window("dialog", SCRIPT_NAME + " — Settings");
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.spacing = 10; dlg.margins = 14;

        // --- Theme ---
        var pTheme = dlg.add("panel", undefined, "Apparence");
        pTheme.orientation = "column"; pTheme.alignChildren = ["left", "top"]; pTheme.margins = 12;

        var gTheme = pTheme.add("group");
        gTheme.add("statictext", undefined, "Thème :");
        var rbDark  = gTheme.add("radiobutton", undefined, "Dark");
        var rbLight = gTheme.add("radiobutton", undefined, "Light");
        (settings.theme === "light" ? rbLight : rbDark).value = true;

        var gAccent = pTheme.add("group");
        gAccent.add("statictext", undefined, "Couleur d'accent :");
        var ddAccent = gAccent.add("dropdownlist", undefined, (function () {
            var names = [];
            for (var i = 0; i < ACCENT_PRESETS.length; i++) names.push(ACCENT_PRESETS[i].name);
            return names;
        })());
        ddAccent.selection = 0;
        for (var i = 0; i < ACCENT_PRESETS.length; i++) {
            if (ACCENT_PRESETS[i].hex === settings.accent) ddAccent.selection = i;
        }
        var gHex = pTheme.add("group");
        gHex.add("statictext", undefined, "Ou hex personnalisé :");
        var etHex = gHex.add("edittext", undefined, settings.accent);
        etHex.characters = 9;

        // --- Zoom defaults ---
        var pZoom = dlg.add("panel", undefined, "Smooth Zoom");
        pZoom.orientation = "column"; pZoom.alignChildren = ["left", "top"]; pZoom.margins = 12;
        var gAmt = pZoom.add("group");
        gAmt.add("statictext", undefined, "Intensité (%) :");
        var etAmt = gAmt.add("edittext", undefined, String(settings.zoomAmount)); etAmt.characters = 5;
        var gDur = pZoom.add("group");
        gDur.add("statictext", undefined, "Durée (frames) :");
        var etDur = gDur.add("edittext", undefined, String(settings.zoomFrames)); etDur.characters = 5;

        // --- License ---
        var pLic = dlg.add("panel", undefined, "Licence");
        pLic.orientation = "column"; pLic.alignChildren = ["fill", "top"]; pLic.margins = 12;
        var licStatus = pLic.add("statictext", undefined,
            isLicensed() ? "✓ Licence activée" : "Mode essai — entrez votre clé (EHP-XXXX-XXXX-XXXX)");
        var gKey = pLic.add("group");
        var etKey = gKey.add("edittext", undefined, settings.licenseKey); etKey.characters = 22;
        var btnActivate = gKey.add("button", undefined, "Activer");
        btnActivate.onClick = function () {
            if (validateLicenseKey(etKey.text)) {
                settings.licenseKey = etKey.text.toUpperCase().replace(/\s/g, "");
                saveSetting("licenseKey", settings.licenseKey);
                licStatus.text = "✓ Licence activée";
                alert(SCRIPT_NAME + "\n\nMerci ! Votre licence est activée.");
            } else {
                alert(SCRIPT_NAME + "\n\nClé invalide. Vérifiez le format EHP-XXXX-XXXX-XXXX.");
            }
        };

        // --- Buttons ---
        var gBtns = dlg.add("group");
        gBtns.alignment = ["right", "top"];
        var btnCancel = gBtns.add("button", undefined, "Annuler");
        var btnSave   = gBtns.add("button", undefined, "Enregistrer");

        btnCancel.onClick = function () { dlg.close(); };
        btnSave.onClick = function () {
            settings.theme = rbLight.value ? "light" : "dark";

            // Hex field overrides preset if it's a valid color
            var hex = etHex.text.replace(/\s/g, "");
            if (/^#?[0-9A-Fa-f]{6}$/.test(hex)) {
                settings.accent = (hex.charAt(0) === "#" ? hex : "#" + hex).toUpperCase();
            } else if (ddAccent.selection !== null) {
                settings.accent = ACCENT_PRESETS[ddAccent.selection.index].hex;
            }

            var amt = parseFloat(etAmt.text);
            var dur = parseInt(etDur.text, 10);
            if (!isNaN(amt) && amt > 0 && amt <= 200) settings.zoomAmount = amt;
            if (!isNaN(dur) && dur > 0 && dur <= 120) settings.zoomFrames = dur;

            saveSetting("theme", settings.theme);
            saveSetting("accent", settings.accent);
            saveSetting("zoomAmount", settings.zoomAmount);
            saveSetting("zoomFrames", settings.zoomFrames);

            applyTheme(mainPanel);
            dlg.close();
        };

        dlg.center();
        dlg.show();
    }

    /** Re-applies theme colors to the whole panel. */
    function applyTheme(panel) {
        var th = theme();
        try {
            panel.graphics.backgroundColor =
                panel.graphics.newBrush(panel.graphics.BrushType.SOLID_COLOR, th.bg);
        } catch (e) {}
        for (var i = 0; i < allButtons.length; i++) allButtons[i].notify("onDraw");
        for (var j = 0; j < allHeaders.length; j++) allHeaders[j].notify("onDraw");
        if (panel.layout) panel.layout.layout(true);
    }

    // ============================================================
    //  MAIN UI
    // ============================================================

    function buildUI(thisObj) {
        var panel = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", SCRIPT_NAME, undefined, { resizeable: true });

        panel.orientation = "column";
        panel.alignChildren = ["fill", "top"];
        panel.spacing = 6;
        panel.margins = 10;

        // ---- LAYERS ----
        sectionHeader(panel, "LAYERS");
        iconButton(panel, "Adjustment Layer", "adjustment",
            "Calque d'ajustement EH_Adjustment au-dessus de la sélection (ou toute la comp).",
            createAdjustmentLayer);
        iconButton(panel, "White Flash", "flash",
            "Flash blanc de 6 frames au temps courant (opacité 100→0).",
            function () { createFlash("white"); });
        iconButton(panel, "Black Flash", "flash",
            "Flash noir de 6 frames au temps courant (opacité 100→0).",
            function () { createFlash("black"); });

        // ---- ZOOMS ----
        sectionHeader(panel, "ZOOMS");
        iconButton(panel, "Smooth Zoom In", "zoomIn",
            "Zoom avant progressif (+" + settings.zoomAmount + "% par défaut, réglable dans Settings).",
            function () { smoothZoom("in"); });
        iconButton(panel, "Smooth Zoom Out", "zoomOut",
            "Zoom arrière progressif.",
            function () { smoothZoom("out"); });
        iconButton(panel, "Punch Out-In", "punch",
            "Zoom arrière puis retour — effet de recul/punch.",
            function () { smoothZoom("outin"); });
        iconButton(panel, "Punch In-Out", "punch",
            "Zoom avant puis retour — effet d'impact.",
            function () { smoothZoom("inout"); });

        // ---- SHAKES ----
        sectionHeader(panel, "SHAKES");
        iconButton(panel, "Quick Shake — Light", "shake",
            "Shake léger sur calque d'ajustement (non destructif, 10 frames).",
            function () { quickShake(10, 15, "Light"); });
        iconButton(panel, "Quick Shake — Medium", "shake",
            "Shake moyen sur calque d'ajustement (non destructif, 10 frames).",
            function () { quickShake(15, 30, "Medium"); });
        iconButton(panel, "Quick Shake — Heavy", "shake",
            "Gros shake sur calque d'ajustement (non destructif, 10 frames).",
            function () { quickShake(20, 50, "Heavy"); });
        iconButton(panel, "Impact Shake (expression)", "shake",
            "wiggle(18, 35) directement sur la Position des calques sélectionnés.",
            impactShake);

        // ---- EFFECTS ----
        sectionHeader(panel, "EFFECTS");
        iconButton(panel, "RGB Split", "rgb",
            "Vraie séparation R/G/B via Shift Channels + mode Add.",
            rgbSplit);
        iconButton(panel, "Glow Boost", "glow",
            "Effet Glow natif (Threshold 60, Radius 35, Intensity 1.5).",
            glowBoost);
        iconButton(panel, "Speed Lines (anime)", "lines",
            "Lignes de vitesse radiales façon anime — 100% effets natifs.",
            speedLines);
        iconButton(panel, "Freeze Frame", "freeze",
            "Fige le calque sélectionné au temps courant (split + time remap hold).",
            freezeFrame);

        // ---- PROJECT ----
        sectionHeader(panel, "PROJECT");
        iconButton(panel, "Auto Precomp", "precomp",
            "Précompose la sélection en EH_Precomp_XX.",
            autoPrecompSelected);
        iconButton(panel, "Organize Project", "folder",
            "Crée les dossiers standards et range tous les items du projet.",
            organizeProject);

        // ---- Footer: settings + version + license badge ----
        var footer = panel.add("group");
        footer.alignment = ["fill", "bottom"];
        footer.spacing = 8;

        var btnSettings = iconButton(footer, "Settings & Theme", "gear",
            "Personnaliser le thème, la couleur d'accent, les zooms et la licence.",
            function () { openSettingsDialog(panel); });
        btnSettings.preferredSize = [150, 26];

        var verText = panel.add("statictext", undefined,
            SCRIPT_NAME + " v" + SCRIPT_VERSION + (isLicensed() ? "  •  Licensed" : "  •  Trial"));
        verText.alignment = ["center", "bottom"];

        applyTheme(panel);

        if (panel instanceof Window) {
            panel.center();
            panel.show();
        } else {
            panel.layout.layout(true);
        }
        return panel;
    }

    buildUI(thisObj);

}(this));
