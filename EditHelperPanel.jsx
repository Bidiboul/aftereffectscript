/**
 * Edit Helper Panel v0.7
 * ScriptUI Panel for Adobe After Effects (2024+)
 *
 * Place in: [AE Install]/Scripts/ScriptUI Panels/
 * Open via: Window > Edit Helper Panel
 *
 * New in v0.7:
 *  - New "Transitions" tab — Transition Builder: Whip Pan Left/Right,
 *    Slide From Left/Right/Top/Bottom (with motion blur), Spin Blur,
 *    Zoom Blur, RGB Glitch Transition, Flash Cut, Camera Shake
 *    Transition, Warp/Distort Transition (Turbulent Displace).
 *
 * New in v0.6:
 *  - Beat Sync tools (Sounds tab): apply Flash, Shake, Zoom Punch, RGB Split
 *    or a full "Anime Beat Pack" combo on every comp marker — pairs with
 *    Auto Music Markers for instant cut-on-the-beat edits.
 *  - Render Queue helper: "Add to Render Queue" button.
 *  - Project Cleaner Pro: "Find Missing Footage" and "Remove Unused
 *    Footage" tools.
 *
 * New in v0.5.1:
 *  - Auto Music Markers: places composition markers on the beat based on
 *    a BPM value entered in a small dialog (Sounds tab).
 *
 * New in v0.5:
 *  - Color Grading presets (Teal & Orange, Moody Cinematic, Pastel Anime,
 *    High Contrast B&W) in the Overlays tab.
 *  - TikTok Caption Style for text layers.
 *  - Clean EH_ Layers project cleanup tool.
 *  - New "Templates" tab with 4 one-click sequence combos.
 *
 * New in v0.4:
 *  - Full UI overhaul: every action is now a real ScriptUI Button (always
 *    clickable, even in narrow docked panels) with a short description
 *    line underneath explaining what it does.
 *  - Single-column layout per tab — the panel scrolls naturally when the
 *    docked area is shorter than the content.
 *  - New "AI Chat" tab: describe an effect in plain language and the
 *    assistant applies it directly (local keyword matcher, with optional
 *    connection to a real LLM via a local "AI Bridge" — see README).
 */

(function EditHelperPanel(thisObj) {

    var SCRIPT_NAME    = "Edit Helper Panel";
    var SCRIPT_VERSION = "0.7";
    var SETTINGS_KEY   = "EditHelperPanel";

    // ============================================================
    //  SETTINGS
    // ============================================================

    var DEFAULTS = {
        theme       : "dark",
        accent      : "#7C5CFF",
        zoomAmount  : 15,
        zoomFrames  : 12,
        licenseKey  : "",
        soundFolder : "",
        aiBridgeHost: ""
    };

    function loadSetting(key) {
        try {
            if (app.settings.haveSetting(SETTINGS_KEY, key))
                return app.settings.getSetting(SETTINGS_KEY, key);
        } catch (e) {}
        return String(DEFAULTS[key]);
    }
    function saveSetting(key, value) {
        try { app.settings.saveSetting(SETTINGS_KEY, key, String(value)); } catch (e) {}
    }

    var settings = {
        theme       : loadSetting("theme"),
        accent      : loadSetting("accent"),
        zoomAmount  : parseFloat(loadSetting("zoomAmount")),
        zoomFrames  : parseInt(loadSetting("zoomFrames"), 10),
        licenseKey  : loadSetting("licenseKey"),
        soundFolder : loadSetting("soundFolder"),
        aiBridgeHost: loadSetting("aiBridgeHost")
    };

    // ============================================================
    //  THEME
    // ============================================================

    var THEMES = {
        dark:  { bg: [0.13,0.13,0.15], panel: [0.17,0.17,0.20], text: [0.92,0.92,0.95],
                 subtext: [0.60,0.60,0.66], btnHover: [0.26,0.26,0.31] },
        light: { bg: [0.93,0.93,0.95], panel: [0.88,0.88,0.91], text: [0.12,0.12,0.15],
                 subtext: [0.40,0.40,0.46], btnHover: [0.80,0.80,0.85] }
    };

    var ACCENT_PRESETS = [
        { name:"Violet",         hex:"#7C5CFF" },
        { name:"Cyan",           hex:"#2FD3E0" },
        { name:"Rose",           hex:"#FF4D7D" },
        { name:"Lime",           hex:"#9BE15D" },
        { name:"Orange",         hex:"#FF9040" },
        { name:"Rouge Valorant", hex:"#FF4655" }
    ];

    function hexToRgb(hex) {
        hex = hex.replace("#", "");
        return [parseInt(hex.substring(0,2),16)/255,
                parseInt(hex.substring(2,4),16)/255,
                parseInt(hex.substring(4,6),16)/255];
    }
    function theme()  { return THEMES[settings.theme] || THEMES.dark; }
    function accent() { return hexToRgb(settings.accent); }

    // ============================================================
    //  LICENSE
    // ============================================================

    function computeChecksum(payload) {
        var sum = 0;
        for (var i = 0; i < payload.length; i++) sum += payload.charCodeAt(i) * (i + 7);
        var c = (sum % 9973).toString(36).toUpperCase();
        while (c.length < 4) c = "0" + c;
        return c;
    }
    function validateLicenseKey(key) {
        key = key.toUpperCase().replace(/\s/g,"");
        var m = key.match(/^EHP-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/);
        if (!m) return false;
        return computeChecksum(m[1] + m[2]) === m[3];
    }
    function isLicensed() { return validateLicenseKey(settings.licenseKey); }

    // ============================================================
    //  UTILITIES
    // ============================================================

    function getActiveComp() {
        return app.project.activeItem instanceof CompItem ? app.project.activeItem : null;
    }
    function requireActiveComp() {
        var comp = getActiveComp();
        if (!comp) {
            alert(SCRIPT_NAME + "\n\nAucune composition active.\nOuvrez ou sélectionnez une composition.");
            throw new Error("No active comp");
        }
        return comp;
    }
    function getSelectedLayers(comp) { return comp.selectedLayers; }
    function framesToSeconds(frames, comp) { return frames / comp.frameRate; }

    function createFolderIfMissing(name) {
        var items = app.project.items;
        for (var i = 1; i <= items.length; i++)
            if (items[i] instanceof FolderItem && items[i].name === name) return items[i];
        return app.project.items.addFolder(name);
    }
    function getUniqueCompName(baseName) {
        var idx = 1, candidate = baseName;
        while (true) {
            var found = false;
            for (var i = 1; i <= app.project.items.length; i++)
                if (app.project.items[i].name === candidate) { found = true; break; }
            if (!found) return candidate;
            idx++;
            candidate = baseName.replace(/\d+$/, "") + (idx < 10 ? "0" + idx : idx);
        }
    }
    function easeLastKeys(prop, count) {
        try {
            var e = [new KeyframeEase(0.5, 33.33)];
            var dims = (prop.value instanceof Array) ? prop.value.length : 1;
            var ea = []; for (var d = 0; d < dims; d++) ea.push(e[0]);
            for (var k = prop.numKeys - count + 1; k <= prop.numKeys; k++)
                prop.setTemporalEaseAtKey(k, ea, ea);
        } catch (e) {}
    }
    function withUndo(label, fn) {
        app.beginUndoGroup("EH: " + label);
        try { fn(); }
        catch (e) { if (e.message !== "No active comp") alert("EH Error: " + e.message); }
        app.endUndoGroup();
    }
    function requireSelection(comp, feat) {
        if (getSelectedLayers(comp).length === 0) {
            alert(SCRIPT_NAME + "\n\n" + feat + " : sélectionnez au moins un calque.");
            return false;
        }
        return true;
    }

    // ============================================================
    //  FEATURES — EDIT TAB (unchanged from v0.2)
    // ============================================================

    function createAdjustmentLayer() {
        withUndo("Adjustment Layer", function() {
            var comp = requireActiveComp(), selected = getSelectedLayers(comp);
            var inPoint = comp.workAreaStart, duration = comp.workAreaDuration;
            if (selected.length > 0) {
                var e = selected[0].inPoint, l = selected[0].outPoint;
                for (var i = 1; i < selected.length; i++) {
                    if (selected[i].inPoint  < e) e = selected[i].inPoint;
                    if (selected[i].outPoint > l) l = selected[i].outPoint;
                }
                inPoint = e; duration = l - e;
            }
            var adj = comp.layers.addSolid([0.5,0.5,0.5], "EH_Adjustment",
                comp.width, comp.height, comp.pixelAspect, duration);
            adj.adjustmentLayer = true; adj.inPoint = inPoint;
            adj.name = "EH_Adjustment"; adj.moveToBeginning();
        });
    }

    function createFlash(color) {
        withUndo((color==="white"?"White":"Black")+" Flash", function() {
            var comp = requireActiveComp();
            var s = comp.time, e = Math.min(s + framesToSeconds(6, comp), comp.duration);
            var name = color==="white" ? "EH_White_Flash" : "EH_Black_Flash";
            var col  = color==="white" ? [1,1,1] : [0,0,0];
            var fl = comp.layers.addSolid(col, name, comp.width, comp.height, comp.pixelAspect, e-s);
            fl.inPoint = s; fl.name = name;
            var op = fl.property("Transform").property("Opacity");
            op.setValueAtTime(s, 100); op.setValueAtTime(e, 0);
            fl.moveToBeginning();
        });
    }

    function smoothZoom(mode) {
        withUndo("Smooth Zoom "+mode, function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Smooth Zoom")) return;
            var amt = settings.zoomAmount / 100;
            var half = framesToSeconds(settings.zoomFrames, comp);
            var t1 = comp.time, t2 = t1+half, t3 = t2+half;
            var sel = getSelectedLayers(comp);
            for (var i = 0; i < sel.length; i++) {
                var scale = sel[i].property("Transform").property("Scale");
                var b = scale.value;
                function sc(f) { var v=[]; for(var j=0;j<b.length;j++) v.push(b[j]*f); return v; }
                if (mode==="in")    { scale.setValueAtTime(t1,b); scale.setValueAtTime(t2,sc(1+amt)); easeLastKeys(scale,2); }
                else if(mode==="out"){ scale.setValueAtTime(t1,b); scale.setValueAtTime(t2,sc(1-amt)); easeLastKeys(scale,2); }
                else if(mode==="outin"){ scale.setValueAtTime(t1,b);scale.setValueAtTime(t2,sc(1-amt));scale.setValueAtTime(t3,b); easeLastKeys(scale,3); }
                else { scale.setValueAtTime(t1,b);scale.setValueAtTime(t2,sc(1+amt));scale.setValueAtTime(t3,b); easeLastKeys(scale,3); }
            }
        });
    }

    function impactShake() {
        withUndo("Impact Shake", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Impact Shake")) return;
            var sel = getSelectedLayers(comp);
            for (var i=0;i<sel.length;i++)
                sel[i].property("Transform").property("Position").expression = "wiggle(18, 35)";
        });
    }

    function quickShake(freq, amp, label) {
        withUndo("Quick Shake "+label, function() {
            var comp = requireActiveComp();
            var s = comp.time, e = Math.min(s + framesToSeconds(10,comp), comp.duration);
            var adj = comp.layers.addSolid([0.5,0.5,0.5],"EH_Shake_"+label,
                comp.width,comp.height,comp.pixelAspect,e-s);
            adj.adjustmentLayer=true; adj.inPoint=s; adj.name="EH_Shake_"+label; adj.moveToBeginning();
            var fx = adj.Effects.addProperty("ADBE Geometry2");
            try { fx.property("ADBE Geometry2-0005").setValue(100+amp/8); } catch(e2){}
            try { fx.property("ADBE Geometry2-0006").setValue(100+amp/8); } catch(e2){}
            fx.property("ADBE Geometry2-0002").expression = "wiggle("+freq+", "+amp+")";
        });
    }

    function rgbSplit() {
        withUndo("RGB Split", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp,"RGB Split")) return;
            var src = getSelectedLayers(comp)[0];
            function mkDup(name,dx,dy,r,g,b) {
                var d=src.duplicate(); d.name=name;
                var p=d.property("Transform").property("Position"), v=p.value;
                var np=[v[0]+dx,v[1]+dy]; if(v.length===3)np.push(v[2]); p.setValue(np);
                var sc=d.Effects.addProperty("ADBE Shift Channels");
                sc.property("ADBE Shift Channels-0002").setValue(r);
                sc.property("ADBE Shift Channels-0003").setValue(g);
                sc.property("ADBE Shift Channels-0004").setValue(b);
                d.blendingMode=BlendingMode.ADD;
            }
            var OFF=10,R=2,G=3,B=4;
            mkDup("EH_RGB_Blue",  0, 4,OFF,OFF,B);
            mkDup("EH_RGB_Green",-4, 0,OFF,G,OFF);
            mkDup("EH_RGB_Red",   4, 0,R,OFF,OFF);
            src.enabled=false;
        });
    }

    function glowBoost() {
        withUndo("Glow Boost", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp,"Glow Boost")) return;
            var sel = getSelectedLayers(comp);
            for(var i=0;i<sel.length;i++){
                var g=sel[i].Effects.addProperty("ADBE Glow");
                g.property("ADBE Glow-0001").setValue(0.6);
                g.property("ADBE Glow-0002").setValue(35);
                g.property("ADBE Glow-0003").setValue(1.5);
            }
        });
    }

    function freezeFrame() {
        withUndo("Freeze Frame", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp,"Freeze Frame")) return;
            var sel = getSelectedLayers(comp).slice(0), t = comp.time;
            for(var i=0;i<sel.length;i++){
                var layer=sel[i];
                if(t<=layer.inPoint||t>=layer.outPoint){
                    alert(SCRIPT_NAME+"\n\nFreeze Frame : placez la tête de lecture dans le calque \""+layer.name+"\".");
                    continue;
                }
                var frozen=layer.duplicate(); frozen.name=layer.name+"_FREEZE";
                layer.outPoint=t;
                frozen.timeRemapEnabled=true;
                var tr=frozen.property("ADBE Time Remapping");
                tr.setValueAtTime(t, tr.valueAtTime(t,false));
                for(var k=1;k<=tr.numKeys;k++)
                    tr.setInterpolationTypeAtKey(k,KeyframeInterpolationType.HOLD);
                frozen.inPoint=t; frozen.outPoint=comp.duration;
            }
        });
    }

    function speedLines() {
        withUndo("Speed Lines", function() {
            var comp = requireActiveComp();
            var s=comp.time, e=Math.min(s+2,comp.duration);
            var solid=comp.layers.addSolid([1,1,1],"EH_Speed_Lines",comp.width,comp.height,comp.pixelAspect,e-s);
            solid.inPoint=s; solid.name="EH_Speed_Lines"; solid.blendingMode=BlendingMode.SCREEN; solid.moveToBeginning();
            var n=solid.Effects.addProperty("ADBE Fractal Noise");
            n.property("ADBE Fractal Noise-0001").setValue(1);
            n.property("ADBE Fractal Noise-0003").setValue(600);
            n.property("ADBE Fractal Noise-0004").setValue(-90);
            n.property("ADBE Fractal Noise-0007").setValue(false);
            n.property("ADBE Fractal Noise-0009").setValue(2000);
            n.property("ADBE Fractal Noise-0010").setValue(15);
            n.property("ADBE Fractal Noise-0014").expression="time * 4000";
            var p=solid.Effects.addProperty("ADBE Polar Coordinates");
            p.property("ADBE Polar Coordinates-0001").setValue(1);
            p.property("ADBE Polar Coordinates-0002").setValue(2);
        });
    }

    function autoPrecompSelected() {
        withUndo("Auto Precomp", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp,"Auto Precomp")) return;
            var sel=getSelectedLayers(comp), idxs=[];
            for(var i=0;i<sel.length;i++) idxs.push(sel[i].index);
            comp.layers.precompose(idxs, getUniqueCompName("EH_Precomp_01"), true);
        });
    }

    function organizeProject() {
        withUndo("Organize Project", function() {
            var f={ comps:createFolderIfMissing("01_Comps"),footage:createFolderIfMissing("02_Footage"),
                    audio:createFolderIfMissing("03_Audio"),precomps:createFolderIfMissing("04_Precomps"),
                    solids:createFolderIfMissing("05_Solids") };
            var items=[];
            for(var i=1;i<=app.project.items.length;i++) items.push(app.project.items[i]);
            for(var j=0;j<items.length;j++){
                var item=items[j]; if(item instanceof FolderItem) continue;
                if(item instanceof CompItem){
                    item.parentFolder=(item.name.toLowerCase().indexOf("precomp")!==-1)?f.precomps:f.comps;
                } else if(item instanceof FootageItem){
                    if(item.mainSource instanceof SolidSource) item.parentFolder=f.solids;
                    else if(item.mainSource instanceof FileSource){
                        item.parentFolder=item.name.toLowerCase().match(/\.(mp3|wav|aac|aif|aiff|m4a|ogg|flac)$/)
                            ? f.audio : f.footage;
                    }
                }
            }
            alert(SCRIPT_NAME+"\n\nProjet organisé avec succès.");
        });
    }

    // ============================================================
    //  FEATURES — TEXT ANIMATIONS
    // ============================================================

    /**
     * Helper: get the text animators property group on a text layer.
     * Returns null if the layer is not a text layer.
     */
    function getTextAnimators(layer) {
        try {
            var tp = layer.property("ADBE Text Properties");
            return tp ? tp.property("ADBE Text Animators") : null;
        } catch(e) { return null; }
    }

    /**
     * Builds a Range Selector + Opacity animator on a text layer.
     * animValue: the "hidden" opacity value (0 = chars start invisible).
     * Animates the selector End: 0% → 100% over `durationFrames`.
     */
    function applyTextOpacityReveal(layer, animName, fromOpac, durationFrames) {
        var comp = layer.containingComp;
        var anims = getTextAnimators(layer);
        if (!anims) throw new Error("Sélectionnez un calque de texte.");

        var anim = anims.addProperty("ADBE Text Animator");
        anim.name = animName;

        // Opacity property
        var props = anim.property("ADBE Text Animator Properties");
        var op = props.addProperty("ADBE Text Opacity");
        op.setValue(fromOpac);

        // Range selector
        var sels  = anim.property("ADBE Text Selectors");
        var sel   = sels.addProperty("ADBE Text Selector");
        // Based on: Characters
        try { sel.property("ADBE Text Range Units").setValue(1); } catch(e) {}

        var t1 = comp.time, t2 = t1 + framesToSeconds(durationFrames, comp);
        var endProp = sel.property("ADBE Text Selector End");
        endProp.setValueAtTime(t1, 0);
        endProp.setValueAtTime(t2, 100);
        easeLastKeys(endProp, 2);
        return anim;
    }

    /** 1. Typewriter — characters appear one by one (opacity reveal, char mode). */
    function textTypewriter() {
        withUndo("Text: Typewriter", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Typewriter")) return;
            var sel = getSelectedLayers(comp);
            for (var i = 0; i < sel.length; i++)
                applyTextOpacityReveal(sel[i], "EH_Typewriter", 0, 24);
        });
    }

    /**
     * 2. Fade Up — characters fade in from below (opacity + Y offset).
     * durationFrames covers the full reveal.
     */
    function textFadeUp() {
        withUndo("Text: Fade Up", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Fade Up")) return;
            var sel = getSelectedLayers(comp);
            for (var i = 0; i < sel.length; i++) {
                var layer = sel[i];
                var anims = getTextAnimators(layer);
                if (!anims) { alert(SCRIPT_NAME+"\n\nFade Up : \""+layer.name+"\" n'est pas un calque de texte."); continue; }

                var anim  = anims.addProperty("ADBE Text Animator");
                anim.name = "EH_FadeUp";
                var props = anim.property("ADBE Text Animator Properties");

                // Y offset: +40 px (below)
                var pos = props.addProperty("ADBE Text Position");
                pos.setValue([0, 40]);
                // Opacity: 0%
                var op = props.addProperty("ADBE Text Opacity");
                op.setValue(0);

                var sels = anim.property("ADBE Text Selectors");
                var sel2 = sels.addProperty("ADBE Text Selector");
                try { sel2.property("ADBE Text Range Units").setValue(3); } catch(e) {} // Words

                var t1 = comp.time, t2 = t1 + framesToSeconds(18, comp);
                var endProp = sel2.property("ADBE Text Selector End");
                endProp.setValueAtTime(t1, 0);
                endProp.setValueAtTime(t2, 100);
                easeLastKeys(endProp, 2);
            }
        });
    }

    /**
     * 3. Bounce In — characters scale from 0 → 120 → 100 % (two keyframes on Scale).
     * Uses a text Scale animator; the bounce is baked in keyframes.
     */
    function textBounceIn() {
        withUndo("Text: Bounce In", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Bounce In")) return;
            var sel = getSelectedLayers(comp);
            for (var i = 0; i < sel.length; i++) {
                var layer = sel[i];
                var anims = getTextAnimators(layer);
                if (!anims) { alert(SCRIPT_NAME+"\n\nBounce In : \""+layer.name+"\" n'est pas un calque de texte."); continue; }

                var anim  = anims.addProperty("ADBE Text Animator");
                anim.name = "EH_BounceIn";
                var props = anim.property("ADBE Text Animator Properties");

                var scProp = props.addProperty("ADBE Text Scale");
                var opProp = props.addProperty("ADBE Text Opacity");
                opProp.setValue(0);

                var sels = anim.property("ADBE Text Selectors");
                var sel2 = sels.addProperty("ADBE Text Selector");
                try { sel2.property("ADBE Text Range Units").setValue(1); } catch(e) {} // Chars

                var t1 = comp.time;
                var t2 = t1 + framesToSeconds(8, comp);
                var t3 = t1 + framesToSeconds(14, comp);

                // End: 0→100 as chars enter
                var endProp = sel2.property("ADBE Text Selector End");
                endProp.setValueAtTime(t1, 0);
                endProp.setValueAtTime(t3, 100);
                easeLastKeys(endProp, 2);

                // Scale overshoots: 0 → 120 → 100 (using non-uniform values)
                scProp.setValueAtTime(t1, [0, 0]);
                scProp.setValueAtTime(t2, [120, 120]);
                scProp.setValueAtTime(t3, [100, 100]);
                easeLastKeys(scProp, 3);
            }
        });
    }

    /**
     * 4. Glitch — rapid position jitter via wiggle expression on the selector offset,
     * combined with opacity flicker.
     */
    function textGlitch() {
        withUndo("Text: Glitch", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Glitch")) return;
            var sel = getSelectedLayers(comp);
            for (var i = 0; i < sel.length; i++) {
                var layer = sel[i];
                var anims = getTextAnimators(layer);
                if (!anims) { alert(SCRIPT_NAME+"\n\nGlitch : \""+layer.name+"\" n'est pas un calque de texte."); continue; }

                var anim  = anims.addProperty("ADBE Text Animator");
                anim.name = "EH_Glitch";
                var props = anim.property("ADBE Text Animator Properties");

                var posProp = props.addProperty("ADBE Text Position");
                posProp.expression = "var r=wiggle(30,8); [r[0], r[1]];";

                var opProp = props.addProperty("ADBE Text Opacity");
                opProp.expression = "var t=Math.floor(time*24)%3; t===0?0:100;";

                var sels = anim.property("ADBE Text Selectors");
                var sel2 = sels.addProperty("ADBE Text Selector");
                try { sel2.property("ADBE Text Range Units").setValue(1); } catch(e) {}
                // Wiggly selector: random per character
                sel2.property("ADBE Text Selector End").setValue(100);
                try { sel2.property("ADBE Text Selector Shape").setValue(5); } catch(e) {} // Ramp Up
            }
        });
    }

    /** 5. Slide From Left — position X offset from -200 → 0. */
    function textSlide(direction) {
        withUndo("Text: Slide "+direction, function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Slide")) return;
            var dx = direction==="left" ? -200 : (direction==="right" ? 200 : 0);
            var dy = direction==="top"  ? -60  : (direction==="bottom" ? 60  : 0);
            var sel = getSelectedLayers(comp);
            for (var i = 0; i < sel.length; i++) {
                var layer = sel[i];
                var anims = getTextAnimators(layer);
                if (!anims) { alert(SCRIPT_NAME+"\n\nSlide : \""+layer.name+"\" n'est pas un calque de texte."); continue; }

                var anim  = anims.addProperty("ADBE Text Animator");
                anim.name = "EH_Slide_"+direction;
                var props = anim.property("ADBE Text Animator Properties");

                var pos = props.addProperty("ADBE Text Position");
                pos.setValue([dx, dy]);
                var op = props.addProperty("ADBE Text Opacity");
                op.setValue(0);

                var sels = anim.property("ADBE Text Selectors");
                var sel2 = sels.addProperty("ADBE Text Selector");
                try { sel2.property("ADBE Text Range Units").setValue(4); } catch(e) {} // Lines

                var t1=comp.time, t2=t1+framesToSeconds(16,comp);
                var ep = sel2.property("ADBE Text Selector End");
                ep.setValueAtTime(t1,0); ep.setValueAtTime(t2,100);
                easeLastKeys(ep,2);
            }
        });
    }

    /** 6. Word Reveal — word by word opacity reveal (elegant for titles). */
    function textWordReveal() {
        withUndo("Text: Word Reveal", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Word Reveal")) return;
            var sel = getSelectedLayers(comp);
            for (var i = 0; i < sel.length; i++)
                applyTextOpacityReveal(sel[i], "EH_WordReveal", 0, 20);
        });
    }

    // ============================================================
    //  FEATURES — SOUND BANK
    // ============================================================

    function getSoundFiles() {
        if (!settings.soundFolder) return [];
        var folder = new Folder(settings.soundFolder);
        if (!folder.exists) return [];
        var files = folder.getFiles(/\.(wav|mp3|aif|aiff|m4a|ogg|flac)$/i);
        return files || [];
    }

    function addSoundToComp(filePath) {
        withUndo("Add Sound", function() {
            var comp = requireActiveComp();
            var file = new File(filePath);
            if (!file.exists) { alert(SCRIPT_NAME+"\n\nFichier introuvable :\n"+filePath); return; }

            // Re-use already imported footage if available
            var footage = null;
            for (var i=1; i<=app.project.items.length; i++) {
                var item = app.project.items[i];
                if (item instanceof FootageItem && item.mainSource instanceof FileSource
                    && item.mainSource.file && item.mainSource.file.fsName === file.fsName) {
                    footage = item; break;
                }
            }
            if (!footage) footage = app.project.importFile(new ImportOptions(file));

            var layer = comp.layers.add(footage);
            layer.inPoint  = comp.time;
            layer.outPoint = Math.min(comp.time + footage.duration, comp.duration);

            // Move to audio folder if it exists
            try { footage.parentFolder = createFolderIfMissing("03_Audio"); } catch(e) {}
        });
    }

    // ============================================================
    //  FEATURES — OVERLAYS
    // ============================================================

    /** Helper: add an adjustment layer solid for overlays. */
    function addOverlayAdj(comp, name, dur) {
        var s = comp.time;
        var e = Math.min(s + (dur || comp.duration - s), comp.duration);
        var adj = comp.layers.addSolid([0.5,0.5,0.5], name,
            comp.width, comp.height, comp.pixelAspect, e - s);
        adj.adjustmentLayer = true;
        adj.inPoint = s; adj.name = name;
        adj.moveToBeginning();
        return adj;
    }

    /** Helper: add a plain solid for blend-mode overlays. */
    function addOverlaySolid(comp, name, color, blendMode, dur) {
        var s = comp.time;
        var e = Math.min(s + (dur || comp.duration - s), comp.duration);
        var solid = comp.layers.addSolid(color, name,
            comp.width, comp.height, comp.pixelAspect, e - s);
        solid.inPoint = s; solid.name = name;
        solid.blendingMode = blendMode;
        solid.moveToBeginning();
        return solid;
    }

    /** 1. Film Grain — Add Grain effect on adjustment layer. */
    function overlayFilmGrain() {
        withUndo("Overlay: Film Grain", function() {
            var comp = requireActiveComp();
            var adj = addOverlayAdj(comp, "EH_FilmGrain");
            var fg = adj.Effects.addProperty("ADBE Add Grain");
            try { fg.property("ADBE Grain-intensity").setValue(0.4); } catch(e){}   // Intensity
            try { fg.property("ADBE Grain-size").setValue(1.2);      } catch(e){}   // Size
            try { fg.property("ADBE Grain-color").setValue(0);        } catch(e){}   // Monochrome
        });
    }

    /** 2. Vignette — dark ellipse solid with feathered mask. */
    function overlayVignette() {
        withUndo("Overlay: Vignette", function() {
            var comp = requireActiveComp();
            var solid = addOverlaySolid(comp, "EH_Vignette", [0,0,0], BlendingMode.MULTIPLY);
            // Inverted ellipse mask (the solid shows outside the ellipse)
            var mask = solid.Masks.addProperty("Mask");
            var w = comp.width, h = comp.height;
            var shape = new Shape();
            // Ellipse path approximated with 4 bezier vertices
            var rx = w * 0.48, ry = h * 0.45;
            var cx = w / 2, cy = h / 2;
            var k = 0.5523;
            shape.vertices  = [[cx-rx,cy],[cx,cy-ry],[cx+rx,cy],[cx,cy+ry]];
            shape.inTangents  = [[0, rx*k],[-ry*k,0],[0,-rx*k],[ry*k,0]];
            shape.outTangents = [[0,-rx*k],[ry*k,0],[0, rx*k],[-ry*k,0]];
            shape.closed = true;
            mask.property("ADBE Mask Shape").setValue(shape);
            mask.property("ADBE Mask Feather").setValue([w*0.25, w*0.25]);
            mask.property("ADBE Mask Opacity").setValue(80);
            mask.inverted = true;
        });
    }

    /** 3. Light Leak — warm Fractal Noise on solid in Add mode, animated. */
    function overlayLightLeak() {
        withUndo("Overlay: Light Leak", function() {
            var comp = requireActiveComp();
            // Warm amber solid
            var solid = addOverlaySolid(comp, "EH_LightLeak", [1,0.7,0.2], BlendingMode.ADD);
            solid.adjustmentLayer = false;
            solid.property("Transform").property("Opacity").setValue(60);

            var noise = solid.Effects.addProperty("ADBE Fractal Noise");
            noise.property("ADBE Fractal Noise-0001").setValue(3); // Turbulent Smooth
            noise.property("ADBE Fractal Noise-0007").setValue(false);
            noise.property("ADBE Fractal Noise-0009").setValue(300);
            noise.property("ADBE Fractal Noise-0010").setValue(200);
            noise.property("ADBE Fractal Noise-0014").expression = "time * 0.8";

            // Subtle pan across the frame
            var pos = solid.property("Transform").property("Position");
            var t1 = comp.time, t2 = Math.min(t1 + 3, comp.duration);
            pos.setValueAtTime(t1, [0, comp.height/2]);
            pos.setValueAtTime(t2, [comp.width, comp.height/2]);
            easeLastKeys(pos, 2);
        });
    }

    /** 4. VHS — Wave Warp + Noise + slight desaturation on adjustment layer. */
    function overlayVHS() {
        withUndo("Overlay: VHS", function() {
            var comp = requireActiveComp();
            var adj = addOverlayAdj(comp, "EH_VHS");

            // Horizontal warp
            var warp = adj.Effects.addProperty("ADBE Wave Warp");
            warp.property("ADBE Wave Warp-0001").setValue(3);  // Wave Type: Sine
            warp.property("ADBE Wave Warp-0002").setValue(1);   // Wave Height
            warp.property("ADBE Wave Warp-0003").setValue(comp.width); // Wave Width (full)
            warp.property("ADBE Wave Warp-0004").setValue(90); // Direction: horizontal
            warp.property("ADBE Wave Warp-0006").setValue(1);   // Wave Speed

            // Noise
            var noise = adj.Effects.addProperty("ADBE Noise");
            try { noise.property("ADBE Noise-0001").setValue(8);  } catch(e){} // Amount
            try { noise.property("ADBE Noise-0002").setValue(true); } catch(e){} // Use Color Noise off

            // Slight desaturation via Hue/Sat
            var hs = adj.Effects.addProperty("ADBE HUE SATURATION");
            try { hs.property("ADBE HUE SATURATION-0002").setValue(-30); } catch(e){} // Saturation
        });
    }

    /**
     * 5. Scanlines — horizontal lines overlay via Grid effect on a Screen solid.
     * Uses the native "ADBE Grid" (Grid) effect.
     */
    function overlayScanlines() {
        withUndo("Overlay: Scanlines", function() {
            var comp = requireActiveComp();
            var solid = addOverlaySolid(comp, "EH_Scanlines", [0,0,0], BlendingMode.MULTIPLY);
            solid.adjustmentLayer = false;
            solid.property("Transform").property("Opacity").setValue(30);

            var grid = solid.Effects.addProperty("ADBE Grid");
            try {
                // Size from: Width Slider
                grid.property("ADBE Grid-0002").setValue(2); // Size from (width slider)
                grid.property("ADBE Grid-0004").setValue(comp.width); // Width
                grid.property("ADBE Grid-0005").setValue(4);  // Height (line spacing)
                grid.property("ADBE Grid-0006").setValue(1);  // Border
                grid.property("ADBE Grid-0007").setValue([0,0,0,1]); // Color: black
            } catch(e) {}
        });
    }

    /**
     * 6. Lens Flare — native Lens Flare effect on a solid in Add blend.
     * Centers the flare; can be repositioned in the timeline.
     */
    function overlayLensFlare() {
        withUndo("Overlay: Lens Flare", function() {
            var comp = requireActiveComp();
            var solid = addOverlaySolid(comp, "EH_LensFlare", [0,0,0], BlendingMode.ADD);
            solid.adjustmentLayer = false;

            var lf = solid.Effects.addProperty("ADBE Lens Flare");
            try {
                lf.property("ADBE Lens Flare-0001").setValue([comp.width/2, comp.height/2]);
                lf.property("ADBE Lens Flare-0002").setValue(100); // Brightness
                lf.property("ADBE Lens Flare-0003").setValue(1);   // Lens type: 105mm Prime
            } catch(e) {}

            solid.property("Transform").property("Opacity").setValue(80);
        });
    }

    /** 7. Dust & Scratches — high-contrast Fractal Noise in Screen mode. */
    function overlayDust() {
        withUndo("Overlay: Dust & Scratches", function() {
            var comp = requireActiveComp();
            var solid = addOverlaySolid(comp, "EH_Dust", [1,1,1], BlendingMode.SCREEN);
            solid.adjustmentLayer = false;
            solid.property("Transform").property("Opacity").setValue(25);

            var noise = solid.Effects.addProperty("ADBE Fractal Noise");
            noise.property("ADBE Fractal Noise-0001").setValue(6); // Max
            noise.property("ADBE Fractal Noise-0003").setValue(700); // Contrast
            noise.property("ADBE Fractal Noise-0004").setValue(-200); // Brightness
            noise.property("ADBE Fractal Noise-0007").setValue(false);
            noise.property("ADBE Fractal Noise-0009").setValue(3);   // Very narrow
            noise.property("ADBE Fractal Noise-0010").setValue(comp.height);
            noise.property("ADBE Fractal Noise-0014").expression = "time * 8000";
        });
    }

    /** 8. Color Tint — Tint effect (map black/white to two colors) on adj layer. */
    function overlayColorTint(blackCol, whiteCol, label) {
        withUndo("Overlay: Color Tint "+label, function() {
            var comp = requireActiveComp();
            var adj = addOverlayAdj(comp, "EH_Tint_"+label);
            var tint = adj.Effects.addProperty("ADBE Tint");
            try {
                tint.property("ADBE Tint-0002").setValue(blackCol);  // Map Black To
                tint.property("ADBE Tint-0003").setValue(whiteCol);  // Map White To
                tint.property("ADBE Tint-0004").setValue(60);        // Amount (blend)
            } catch(e) {}
        });
    }

    // ============================================================
    //  FEATURES — COLOR GRADING (native: Brightness&Contrast + Hue/Sat + Tint)
    // ============================================================

    /**
     * Applies a one-click grading look on a new adjustment layer using only
     * native effects: Brightness & Contrast, Hue/Saturation, and an optional
     * Tint (shadows/highlights split-tone).
     */
    function applyGrade(label, brightness, contrast, saturation, tintBlack, tintWhite, tintAmount) {
        withUndo("Grade: "+label, function() {
            var comp = requireActiveComp();
            var adj = addOverlayAdj(comp, "EH_Grade_"+label);

            var bc = adj.Effects.addProperty("ADBE Brightness & Contrast 2");
            try { bc.property("ADBE Brightness & Contrast 2-0001").setValue(brightness); } catch(e){}
            try { bc.property("ADBE Brightness & Contrast 2-0002").setValue(contrast);   } catch(e){}

            var hs = adj.Effects.addProperty("ADBE HUE SATURATION");
            try { hs.property("ADBE HUE SATURATION-0002").setValue(saturation); } catch(e){}

            if (tintBlack) {
                var tint = adj.Effects.addProperty("ADBE Tint");
                try {
                    tint.property("ADBE Tint-0002").setValue(tintBlack);
                    tint.property("ADBE Tint-0003").setValue(tintWhite);
                    tint.property("ADBE Tint-0004").setValue(tintAmount);
                } catch(e) {}
            }
        });
    }

    function gradeTealOrange()  { applyGrade("TealOrange", 0, 15, 20, [0,0.15,0.2], [1,0.75,0.4], 35); }
    function gradeMoody()       { applyGrade("Moody", -10, 25, -20, [0.02,0.05,0.15], [0.9,0.85,0.8], 30); }
    function gradePastelAnime() { applyGrade("PastelAnime", 8, -10, 15, [0.15,0.05,0.2], [1,0.9,0.95], 20); }
    function gradeHighContrastBW() { applyGrade("HighContrastBW", 0, 40, -100, null, null, 0); }

    // ============================================================
    //  FEATURES — CAPTION STYLE (TikTok-style text styling)
    // ============================================================

    /**
     * Applies a TikTok-style caption look to selected text layers:
     * white fill (left as authored), black stroke + drop shadow via native
     * Layer Styles, plus the Bounce In text animator for punchy reveals.
     */
    function captionStyle() {
        withUndo("Text: TikTok Caption", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Caption Style")) return;
            var sel = getSelectedLayers(comp);
            for (var i = 0; i < sel.length; i++) {
                var layer = sel[i];
                if (!getTextAnimators(layer)) {
                    alert(SCRIPT_NAME+"\n\nCaption Style : \""+layer.name+"\" n'est pas un calque de texte.");
                    continue;
                }
                try {
                    var styles = layer.property("ADBE Layer Styles");

                    var stroke = styles.property("ADBE Stroke");
                    stroke.enabled = true;
                    stroke.property("ADBE Stroke Color").setValue([0,0,0]);
                    stroke.property("ADBE Stroke Size").setValue(8);

                    var shadow = styles.property("ADBE Drop Shadow");
                    shadow.enabled = true;
                    shadow.property("ADBE Drop Shadow Opacity").setValue(180);
                    shadow.property("ADBE Drop Shadow Softness").setValue(8);
                    shadow.property("ADBE Drop Shadow Distance").setValue(4);
                } catch(e) {
                    // Layer Styles match-names can vary slightly between AE
                    // versions — the bounce animation below still applies.
                }
            }
        });
        // Add the bounce-in reveal as a separate, already-undo-wrapped step.
        textBounceIn();
    }

    // ============================================================
    //  FEATURES — PROJECT CLEANUP
    // ============================================================

    /** Removes every layer in the active comp whose name starts with "EH_". */
    function removeEHLayers() {
        withUndo("Clean EH_ Layers", function() {
            var comp = requireActiveComp();
            var removed = 0;
            for (var i = comp.numLayers; i >= 1; i--) {
                var layer = comp.layer(i);
                if (layer.name.indexOf("EH_") === 0) { layer.remove(); removed++; }
            }
            alert(SCRIPT_NAME+"\n\n"+removed+" calque(s) EH_ supprimé(s).");
        });
    }

    // ============================================================
    //  FEATURES — AUTO MUSIC MARKERS
    // ============================================================

    /**
     * Opens a small dialog asking for a BPM, a marker interval (every N
     * beats) and a start time, then drops composition markers at every
     * beat across the comp's duration — handy for cutting on the beat.
     */
    function autoMusicMarkers() {
        var comp = requireActiveComp();
        if (!comp) return;

        var dlg = new Window("dialog", SCRIPT_NAME+" — Marqueurs musicaux");
        dlg.orientation="column"; dlg.alignChildren=["fill","top"]; dlg.spacing=10; dlg.margins=14;

        dlg.add("statictext",undefined,
            "Place un marqueur de composition à chaque temps (beat) "+
            "calculé à partir du BPM, sur toute la durée de la comp.",
            {multiline:true});

        var gBpm = dlg.add("group");
        gBpm.add("statictext",undefined,"BPM :");
        var etBpm = gBpm.add("edittext",undefined,"120"); etBpm.characters=6;

        var gEvery = dlg.add("group");
        gEvery.add("statictext",undefined,"Marqueur tous les (beats) :");
        var ddEvery = gEvery.add("dropdownlist",undefined,["1","2","4","8"]);
        ddEvery.selection = 0;

        var gStart = dlg.add("group");
        gStart.add("statictext",undefined,"Départ (secondes) :");
        var etStart = gStart.add("edittext",undefined,String(comp.time.toFixed(2))); etStart.characters=6;

        var gClear = dlg.add("group");
        var cbClear = gClear.add("checkbox",undefined,"Effacer les marqueurs existants avant");
        cbClear.value = false;

        var gBtns = dlg.add("group"); gBtns.alignment=["right","top"];
        gBtns.add("button",undefined,"Annuler").onClick=function(){dlg.close();};
        var btnOk = gBtns.add("button",undefined,"Générer");

        btnOk.onClick = function() {
            var bpm = parseFloat(etBpm.text);
            var start = parseFloat(etStart.text);
            var every = parseInt(ddEvery.selection.text,10);
            if (isNaN(bpm) || bpm <= 0) { alert(SCRIPT_NAME+"\n\nBPM invalide."); return; }
            if (isNaN(start) || start < 0) start = 0;

            withUndo("Auto Music Markers", function() {
                var mp = comp.markerProperty;

                if (cbClear.checked) {
                    for (var i = mp.numKeys; i >= 1; i--) mp.removeKey(i);
                }

                var step = (60 / bpm) * every;
                var count = 0;
                var maxMarkers = 2000;
                for (var t = start; t <= comp.duration + 0.0001 && count < maxMarkers; t += step) {
                    mp.setValueAtTime(t, new MarkerValue("Beat"));
                    count++;
                }
                alert(SCRIPT_NAME+"\n\n"+count+" marqueur(s) ajouté(s) ("+bpm+" BPM, tous les "+every+" beat(s)).");
            });
            dlg.close();
        };

        dlg.center(); dlg.show();
    }

    /** Returns a sorted array of all composition marker times (seconds). */
    function getMarkerTimes(comp) {
        var mp = comp.markerProperty, times = [];
        for (var i = 1; i <= mp.numKeys; i++) times.push(mp.keyTime(i));
        times.sort(function(a,b){ return a-b; });
        return times;
    }
    function requireMarkers(comp) {
        var times = getMarkerTimes(comp);
        if (!times.length) {
            alert(SCRIPT_NAME+"\n\nAucun marqueur trouvé.\nUtilisez d'abord \"Auto Music Markers\".");
            return null;
        }
        if (times.length > 30 && !confirm(
            SCRIPT_NAME+"\n\n"+times.length+" marqueurs détectés.\n"+
            "Cela va créer "+times.length+" calque(s). Continuer ?")) return null;
        return times;
    }

    // ============================================================
    //  FEATURES — BEAT SYNC (apply effects on every comp marker)
    // ============================================================

    function beatFlash(color) {
        withUndo("Beat Flash", function() {
            var comp = requireActiveComp();
            var times = requireMarkers(comp);
            if (!times) return;
            var name = color==="white" ? "EH_White_Flash" : "EH_Black_Flash";
            var col  = color==="white" ? [1,1,1] : [0,0,0];
            for (var i = 0; i < times.length; i++) {
                var s = times[i], e = Math.min(s + framesToSeconds(6, comp), comp.duration);
                if (e <= s) continue;
                var fl = comp.layers.addSolid(col, name, comp.width, comp.height, comp.pixelAspect, e-s);
                fl.inPoint = s; fl.name = name;
                var op = fl.property("Transform").property("Opacity");
                op.setValueAtTime(s, 100); op.setValueAtTime(e, 0);
                fl.moveToBeginning();
            }
        });
    }

    function beatShake(freq, amp, label) {
        withUndo("Beat Shake "+label, function() {
            var comp = requireActiveComp();
            var times = requireMarkers(comp);
            if (!times) return;
            for (var i = 0; i < times.length; i++) {
                var s = times[i], e = Math.min(s + framesToSeconds(10, comp), comp.duration);
                if (e <= s) continue;
                var adj = comp.layers.addSolid([0.5,0.5,0.5],"EH_Shake_"+label,
                    comp.width,comp.height,comp.pixelAspect,e-s);
                adj.adjustmentLayer=true; adj.inPoint=s; adj.name="EH_Shake_"+label; adj.moveToBeginning();
                var fx = adj.Effects.addProperty("ADBE Geometry2");
                try { fx.property("ADBE Geometry2-0005").setValue(100+amp/8); } catch(e2){}
                try { fx.property("ADBE Geometry2-0006").setValue(100+amp/8); } catch(e2){}
                fx.property("ADBE Geometry2-0002").expression = "wiggle("+freq+", "+amp+")";
            }
        });
    }

    function beatZoomPunch() {
        withUndo("Beat Zoom Punch", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Beat Zoom Punch")) return;
            var times = requireMarkers(comp);
            if (!times) return;
            var amt = settings.zoomAmount / 100;
            var half = framesToSeconds(settings.zoomFrames, comp);
            var sel = getSelectedLayers(comp);
            for (var m = 0; m < times.length; m++) {
                var t1 = times[m], t2 = t1+half, t3 = t2+half;
                if (t3 > comp.duration) continue;
                for (var i = 0; i < sel.length; i++) {
                    var scale = sel[i].property("Transform").property("Scale");
                    var b = scale.valueAtTime(t1, false);
                    function sc(f) { var v=[]; for(var j=0;j<b.length;j++) v.push(b[j]*f); return v; }
                    scale.setValueAtTime(t1,b); scale.setValueAtTime(t2,sc(1+amt)); scale.setValueAtTime(t3,b);
                    easeLastKeys(scale,3);
                }
            }
        });
    }

    function beatRGBSplitOnce() {
        withUndo("Beat RGB Split", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Beat RGB Split")) return;
            var times = requireMarkers(comp);
            if (!times) return;
            // RGB Split duplicates layers permanently — only sync to the first marker
            // to avoid creating dozens of duplicate layer stacks.
            comp.time = times[0];
            rgbSplit();
        });
    }

    function beatAnimePack() {
        withUndo("Anime Beat Pack", function() {
            var comp = requireActiveComp();
            var times = requireMarkers(comp);
            if (!times) return;
            beatFlash("white");
            beatShake(15, 30, "Medium");
            if (getSelectedLayers(comp).length > 0) beatZoomPunch();
        });
    }

    // ============================================================
    //  FEATURES — RENDER QUEUE HELPER
    // ============================================================

    function addToRenderQueue() {
        withUndo("Add to Render Queue", function() {
            var comp = requireActiveComp();
            app.project.renderQueue.items.add(comp);
            alert(SCRIPT_NAME+"\n\n\""+comp.name+"\" ajouté à la Render Queue.");
        });
    }

    // ============================================================
    //  FEATURES — PROJECT CLEANER PRO
    // ============================================================

    function findMissingFootage() {
        var missing = [];
        for (var i = 1; i <= app.project.items.length; i++) {
            var it = app.project.items[i];
            if (it instanceof FootageItem && it.footageMissing) missing.push(it.name);
        }
        if (!missing.length) {
            alert(SCRIPT_NAME+"\n\nAucun média manquant.");
        } else {
            alert(SCRIPT_NAME+"\n\nMédia(s) manquant(s) :\n\n- "+missing.join("\n- "));
        }
    }

    function removeUnusedFootage() {
        var unused = [];
        for (var i = 1; i <= app.project.items.length; i++) {
            var it = app.project.items[i];
            if (it instanceof FootageItem && it.usedIn.length === 0) unused.push(it);
        }
        if (!unused.length) {
            alert(SCRIPT_NAME+"\n\nAucun média inutilisé.");
            return;
        }
        var names = []; for (var j=0;j<unused.length;j++) names.push(unused[j].name);
        if (!confirm(SCRIPT_NAME+"\n\nSupprimer "+unused.length+" média(s) inutilisé(s) ?\n\n- "+names.join("\n- ")))
            return;
        withUndo("Remove Unused Footage", function() {
            for (var k=0;k<unused.length;k++) unused[k].remove();
            alert(SCRIPT_NAME+"\n\n"+unused.length+" média(s) inutilisé(s) supprimé(s).");
        });
    }

    // ============================================================
    //  FEATURES — TRANSITION BUILDER
    // ============================================================

    /** Standard short duration (in seconds) for transition effects. */
    function transitionDuration(comp) { return framesToSeconds(8, comp); }

    function whipPan(direction) {
        withUndo("Whip Pan "+direction, function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Whip Pan")) return;
            var dur = transitionDuration(comp);
            var t1 = comp.time, t2 = Math.min(t1+dur, comp.duration);
            var dx = comp.width * (direction==="left" ? -1.5 : 1.5);
            comp.motionBlur = true;
            var sel = getSelectedLayers(comp);
            for (var i = 0; i < sel.length; i++) {
                sel[i].motionBlur = true;
                var pos = sel[i].property("Transform").property("Position");
                var b = pos.valueAtTime(t1, false);
                var b2 = b.slice(); b2[0] = b[0] + dx;
                pos.setValueAtTime(t1, b);
                pos.setValueAtTime(t2, b2);
            }
        });
    }

    function spinBlurTransition() {
        withUndo("Spin Blur Transition", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Spin Blur Transition")) return;
            var dur = transitionDuration(comp);
            var t1 = comp.time, t2 = Math.min(t1+dur, comp.duration);
            comp.motionBlur = true;
            var sel = getSelectedLayers(comp);
            for (var i = 0; i < sel.length; i++) {
                sel[i].motionBlur = true;
                var rot = sel[i].property("Transform").property("Rotation");
                var br = rot.valueAtTime(t1, false);
                rot.setValueAtTime(t1, br);
                rot.setValueAtTime(t2, br + 720);
                var scale = sel[i].property("Transform").property("Scale");
                var bs = scale.valueAtTime(t1, false);
                function sc(f) { var v=[]; for(var j=0;j<bs.length;j++) v.push(bs[j]*f); return v; }
                scale.setValueAtTime(t1, bs);
                scale.setValueAtTime(t2, sc(1.4));
            }
        });
    }

    function zoomBlurTransition() {
        withUndo("Zoom Blur Transition", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Zoom Blur Transition")) return;
            var dur = transitionDuration(comp);
            var t1 = comp.time, t2 = Math.min(t1+dur, comp.duration);
            comp.motionBlur = true;
            var sel = getSelectedLayers(comp);
            for (var i = 0; i < sel.length; i++) {
                sel[i].motionBlur = true;
                var scale = sel[i].property("Transform").property("Scale");
                var b = scale.valueAtTime(t1, false);
                function sc(f) { var v=[]; for(var j=0;j<b.length;j++) v.push(b[j]*f); return v; }
                scale.setValueAtTime(t1, b);
                scale.setValueAtTime(t2, sc(4));
            }
        });
    }

    function rgbGlitchTransition() {
        withUndo("RGB Glitch Transition", function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "RGB Glitch Transition")) return;
            var s = comp.time, dur = transitionDuration(comp), e = Math.min(s+dur, comp.duration);
            rgbSplit();
            var adj = comp.layers.addSolid([0.5,0.5,0.5],"EH_GlitchTransition",
                comp.width,comp.height,comp.pixelAspect,e-s);
            adj.adjustmentLayer = true; adj.inPoint = s; adj.moveToBeginning();
            try {
                var warp = adj.Effects.addProperty("ADBE Wave Warp");
                warp.property("ADBE Wave Warp-0001").setValue(3); // Sine
                var height = warp.property("ADBE Wave Warp-0002");
                height.setValueAtTime(s, 0);
                height.setValueAtTime(s+dur/2, 35);
                height.setValueAtTime(e, 0);
                warp.property("ADBE Wave Warp-0003").setValue(comp.width);
                warp.property("ADBE Wave Warp-0004").setValue(90);
            } catch(ex) {}
        });
    }

    function flashCutTransition() {
        withUndo("Flash Cut Transition", function() {
            var comp = requireActiveComp();
            var s = comp.time, e = Math.min(s + framesToSeconds(2,comp), comp.duration);
            if (e <= s) return;
            var fl = comp.layers.addSolid([1,1,1],"EH_FlashCut",
                comp.width,comp.height,comp.pixelAspect,e-s);
            fl.inPoint = s; fl.moveToBeginning();
            var op = fl.property("Transform").property("Opacity");
            op.setValueAtTime(s, 100); op.setValueAtTime(e, 0);
        });
    }

    function slideMotionBlurTransition(direction) {
        withUndo("Slide Transition "+direction, function() {
            var comp = requireActiveComp();
            if (!requireSelection(comp, "Slide + Motion Blur")) return;
            var dur = transitionDuration(comp) * 1.5;
            var t1 = comp.time, t2 = Math.min(t1+dur, comp.duration);
            var dx=0, dy=0;
            if (direction==="left") dx=-comp.width;
            else if (direction==="right") dx=comp.width;
            else if (direction==="up") dy=-comp.height;
            else dy=comp.height;
            comp.motionBlur = true;
            var sel = getSelectedLayers(comp);
            for (var i = 0; i < sel.length; i++) {
                sel[i].motionBlur = true;
                var pos = sel[i].property("Transform").property("Position");
                var b = pos.valueAtTime(t1, false);
                var b2 = b.slice(); b2[0]+=dx; b2[1]+=dy;
                pos.setValueAtTime(t1, b);
                pos.setValueAtTime(t2, b2);
            }
        });
    }

    function cameraShakeTransition() { quickShake(25, 60, "Transition"); }

    function warpDistortTransition() {
        withUndo("Warp Distort Transition", function() {
            var comp = requireActiveComp();
            var s = comp.time, dur = transitionDuration(comp), e = Math.min(s+dur, comp.duration);
            var adj = comp.layers.addSolid([0.5,0.5,0.5],"EH_WarpTransition",
                comp.width,comp.height,comp.pixelAspect,e-s);
            adj.adjustmentLayer = true; adj.inPoint = s; adj.moveToBeginning();
            try {
                var td = adj.Effects.addProperty("ADBE Turbulent Displace");
                var amt = td.property("ADBE Turbulent Displace-0002"); // Amount
                amt.setValueAtTime(s, 0);
                amt.setValueAtTime(s+dur/2, 80);
                amt.setValueAtTime(e, 0);
            } catch(ex) {}
        });
    }

    // ============================================================
    //  FEATURES — SEQUENCE TEMPLATES (one-click combos)
    // ============================================================

    /** Intro Punch: punch zoom + medium shake + white flash + glow. */
    function templateIntroPunch() {
        smoothZoom("inout");
        quickShake(15, 30, "Medium");
        createFlash("white");
        glowBoost();
    }

    /** Anime Impact: black flash + speed lines + heavy shake + zoom in. */
    function templateAnimeImpact() {
        createFlash("black");
        speedLines();
        quickShake(20, 50, "Heavy");
        smoothZoom("in");
    }

    /** Glitch Transition: RGB split + VHS overlay + medium shake. */
    function templateGlitchTransition() {
        rgbSplit();
        overlayVHS();
        quickShake(15, 30, "Medium");
    }

    /** Cinematic Reveal: zoom in + cinematic tint + vignette + film grain. */
    function templateCinematicReveal() {
        smoothZoom("in");
        overlayColorTint([0.05,0.1,0.3],[1,0.9,0.7],"Cinematic");
        overlayVignette();
        overlayFilmGrain();
    }

    // ============================================================
    //  AI ASSISTANT — DISPATCH TABLE + CHAT
    // ============================================================
    //
    //  Two modes:
    //   1. "Bridge" mode (optional): the panel sends the user's message as
    //      JSON to a local server (e.g. http://127.0.0.1:8787) that you run
    //      yourself and that calls a real LLM (Claude, GPT…). The bridge
    //      replies with JSON: { "action": "<key from DISPATCH>",
    //      "params": {...}, "reply": "<text shown to the user>" }.
    //      ExtendScript's Socket only supports plain TCP, so the bridge
    //      must be a small local HTTP/TCP server — see README for a sample.
    //   2. "Local" mode (always available, no setup): a lightweight
    //      keyword matcher maps the message to an action from DISPATCH.
    //      Used automatically if the bridge is unreachable or unset.
    // ============================================================

    /** Every action the AI assistant (local or bridged) is allowed to trigger. */
    var DISPATCH = {
        adjustmentLayer : { run: createAdjustmentLayer, keywords: ["adjustment","ajustement","calque d'ajustement"] },
        whiteFlash      : { run: function(){createFlash("white");}, keywords: ["white flash","flash blanc","flash"] },
        blackFlash      : { run: function(){createFlash("black");}, keywords: ["black flash","flash noir"] },
        zoomIn          : { run: function(){smoothZoom("in");},  keywords: ["zoom in","zoom avant","smooth zoom in"] },
        zoomOut         : { run: function(){smoothZoom("out");}, keywords: ["zoom out","zoom arrière","dezoom","dézoom"] },
        punchOutIn      : { run: function(){smoothZoom("outin");}, keywords: ["punch out","recul","punch in-out","punch out-in"] },
        punchInOut      : { run: function(){smoothZoom("inout");}, keywords: ["punch in","impact zoom","punch in-out"] },
        shakeLight      : { run: function(){quickShake(10,15,"Light");},  keywords: ["shake light","petit shake","shake léger"] },
        shakeMedium     : { run: function(){quickShake(15,30,"Medium");}, keywords: ["shake medium","shake moyen"] },
        shakeHeavy      : { run: function(){quickShake(20,50,"Heavy");},  keywords: ["shake heavy","gros shake","big shake"] },
        impactShake     : { run: impactShake, keywords: ["wiggle","impact shake","secousse"] },
        rgbSplit        : { run: rgbSplit, keywords: ["rgb split","chromatic aberration","aberration chromatique"] },
        glowBoost       : { run: glowBoost, keywords: ["glow","lumineux","boost lumiere","boost lumière"] },
        speedLines      : { run: speedLines, keywords: ["speed lines","lignes de vitesse","anime lines"] },
        freezeFrame     : { run: freezeFrame, keywords: ["freeze frame","freeze","fige l'image","gel d'image"] },
        autoPrecomp     : { run: autoPrecompSelected, keywords: ["precomp","précompose","precompose"] },
        organizeProject : { run: organizeProject, keywords: ["organize","organise","range le projet","ranger le projet"] },
        textTypewriter  : { run: textTypewriter, keywords: ["typewriter","machine a ecrire","machine à écrire"] },
        textFadeUp      : { run: textFadeUp, keywords: ["fade up","texte qui monte"] },
        textWordReveal  : { run: textWordReveal, keywords: ["word reveal","mot par mot"] },
        textBounceIn    : { run: textBounceIn, keywords: ["bounce in","texte qui rebondit","rebond texte"] },
        textGlitch      : { run: textGlitch, keywords: ["glitch text","texte glitch"] },
        textSlideLeft   : { run: function(){textSlide("left");},  keywords: ["slide left","texte de gauche","slide depuis la gauche"] },
        textSlideRight  : { run: function(){textSlide("right");}, keywords: ["slide right","texte de droite","slide depuis la droite"] },
        textSlideTop    : { run: function(){textSlide("top");},   keywords: ["slide top","texte du haut"] },
        textSlideBottom : { run: function(){textSlide("bottom");},keywords: ["slide bottom","texte du bas"] },
        overlayFilmGrain: { run: overlayFilmGrain, keywords: ["film grain","grain"] },
        overlayVignette : { run: overlayVignette, keywords: ["vignette"] },
        overlayLightLeak: { run: overlayLightLeak, keywords: ["light leak","fuite de lumiere","fuite de lumière"] },
        overlayDust     : { run: overlayDust, keywords: ["dust","poussiere","poussière","scratches","rayures"] },
        overlayScanlines: { run: overlayScanlines, keywords: ["scanlines","scan lines","crt"] },
        overlayVHS      : { run: overlayVHS, keywords: ["vhs","glitch vhs"] },
        overlayLensFlare: { run: overlayLensFlare, keywords: ["lens flare","flare"] },
        tintCinematic   : { run: function(){overlayColorTint([0.05,0.1,0.3],[1,0.9,0.7],"Cinematic");}, keywords: ["cinematic","tint cinema"] },
        tintAnime       : { run: function(){overlayColorTint([0.2,0.05,0.1],[1,0.95,0.7],"AnimeWarm");}, keywords: ["anime warm","tint anime"] },
        tintNight       : { run: function(){overlayColorTint([0,0.05,0.2],[0.7,0.85,1],"NightBlue");}, keywords: ["night blue","tint nuit"] },
        tintSki         : { run: function(){overlayColorTint([0.1,0.15,0.25],[0.95,0.98,1],"SkiSnow");}, keywords: ["ski","snow","neige"] },
        gradeTealOrange : { run: gradeTealOrange, keywords: ["teal and orange","teal & orange","teal orange"] },
        gradeMoody      : { run: gradeMoody, keywords: ["moody","cinematic grade","grade moody"] },
        gradePastelAnime: { run: gradePastelAnime, keywords: ["pastel anime","pastel"] },
        gradeHighContrastBW: { run: gradeHighContrastBW, keywords: ["black and white","noir et blanc","high contrast"] },
        captionStyle    : { run: captionStyle, keywords: ["caption","sous-titre tiktok","tiktok caption"] },
        removeEHLayers  : { run: removeEHLayers, keywords: ["clean","nettoyer","supprime les calques eh","clean up"] },
        templateIntroPunch: { run: templateIntroPunch, keywords: ["intro punch","template intro"] },
        templateAnimeImpact: { run: templateAnimeImpact, keywords: ["anime impact","template anime"] },
        templateGlitchTransition: { run: templateGlitchTransition, keywords: ["glitch transition","template glitch"] },
        templateCinematicReveal: { run: templateCinematicReveal, keywords: ["cinematic reveal","template cinematic"] },
        autoMusicMarkers: { run: autoMusicMarkers, keywords: ["marqueur musique","music marker","marqueurs musicaux","beat marker","marqueur bpm"] },
        beatFlash       : { run: function(){beatFlash("white");}, keywords: ["flash on every beat","flash sur chaque beat","flash sur les marqueurs"] },
        beatShake       : { run: function(){beatShake(15,30,"Medium");}, keywords: ["shake on markers","shake sur les marqueurs","shake on beat"] },
        beatZoomPunch   : { run: beatZoomPunch, keywords: ["zoom on markers","zoom sur les marqueurs","zoom punch on beat"] },
        beatRGBSplit    : { run: beatRGBSplitOnce, keywords: ["rgb split on markers","rgb split sur les marqueurs"] },
        beatAnimePack   : { run: beatAnimePack, keywords: ["anime beat pack","beat pack anime","pack de beats"] },
        addToRenderQueue: { run: addToRenderQueue, keywords: ["render queue","ajoute au rendu","add to render queue"] },
        findMissingFootage: { run: findMissingFootage, keywords: ["missing footage","media manquant","médias manquants"] },
        removeUnusedFootage: { run: removeUnusedFootage, keywords: ["unused footage","media inutilise","médias inutilisés"] },
        whipPanLeft     : { run: function(){whipPan("left");}, keywords: ["whip pan left","whip pan gauche"] },
        whipPanRight    : { run: function(){whipPan("right");}, keywords: ["whip pan right","whip pan droite"] },
        spinBlurTransition: { run: spinBlurTransition, keywords: ["spin blur","transition spin"] },
        zoomBlurTransition: { run: zoomBlurTransition, keywords: ["zoom blur","transition zoom blur"] },
        rgbGlitchTransition: { run: rgbGlitchTransition, keywords: ["rgb glitch transition","glitch rgb transition"] },
        flashCutTransition: { run: flashCutTransition, keywords: ["flash cut","transition flash"] },
        slideLeftTransition: { run: function(){slideMotionBlurTransition("left");}, keywords: ["slide transition left","slide gauche transition"] },
        slideRightTransition: { run: function(){slideMotionBlurTransition("right");}, keywords: ["slide transition right","slide droite transition"] },
        slideUpTransition: { run: function(){slideMotionBlurTransition("up");}, keywords: ["slide transition up","slide haut transition"] },
        slideDownTransition: { run: function(){slideMotionBlurTransition("down");}, keywords: ["slide transition down","slide bas transition"] },
        cameraShakeTransition: { run: cameraShakeTransition, keywords: ["camera shake transition","transition camera shake"] },
        warpDistortTransition: { run: warpDistortTransition, keywords: ["warp transition","distort transition","transition warp"] }
    };

    /**
     * Tries to find an action in DISPATCH whose keywords match the message.
     * Returns the action key, or null if nothing matched.
     */
    function matchLocalAction(message) {
        var msg = message.toLowerCase();
        for (var key in DISPATCH) {
            if (!DISPATCH.hasOwnProperty(key)) continue;
            var kws = DISPATCH[key].keywords;
            for (var i = 0; i < kws.length; i++) {
                if (msg.indexOf(kws[i]) !== -1) return key;
            }
        }
        return null;
    }

    /**
     * Sends the user message to a local AI bridge over plain TCP and waits
     * (briefly) for a JSON reply. Returns null if the bridge is unreachable
     * or replies with invalid data — the caller should fall back to the
     * local keyword matcher in that case.
     *
     * Expected bridge protocol (see README "AI Bridge" section):
     *   Request  (raw line, newline-terminated): {"message": "<user text>"}
     *   Response (raw line, newline-terminated): {"action":"<key>","reply":"<text>"}
     */
    function callAIBridge(message) {
        if (!settings.aiBridgeHost) return null;
        var conn = new Socket();
        try {
            conn.timeout = 3;
            var ok = conn.open(settings.aiBridgeHost, "UTF-8");
            if (!ok) return null;
            conn.write(JSON.stringify({ message: message }) + "\n");
            var raw = conn.read(99999);
            conn.close();
            if (!raw) return null;
            return eval("(" + raw + ")");
        } catch (e) {
            try { conn.close(); } catch(e2) {}
            return null;
        }
    }

    /**
     * Main entry point for the chat: tries the AI bridge first, then falls
     * back to local keyword matching. Executes the matched action (if any)
     * and returns a reply string to display in the chat log.
     */
    function processAssistantMessage(message) {
        // 1. Try the optional AI bridge
        var bridgeResult = callAIBridge(message);
        if (bridgeResult && bridgeResult.action) {
            if (DISPATCH[bridgeResult.action]) {
                DISPATCH[bridgeResult.action].run();
                return bridgeResult.reply || "Action « " + bridgeResult.action + " » appliquée.";
            }
            if (bridgeResult.reply) return bridgeResult.reply;
        }

        // 2. Local keyword matching
        var key = matchLocalAction(message);
        if (key) {
            DISPATCH[key].run();
            return "✓ J'ai appliqué : " + key + ".";
        }

        return "Je n'ai pas reconnu d'action précise pour cette demande. " +
               "Essayez par exemple : \"ajoute un white flash\", \"zoom in sur ce calque\", " +
               "\"applique un glitch sur le texte\", \"ajoute un light leak\"…\n\n" +
               "Pour brancher une vraie IA (Claude, GPT…), configurez un « AI Bridge » dans Settings (voir README).";
    }

    // ============================================================
    //  ICON DRAWING  (same approach as v0.2, extended)
    // ============================================================

    var ICONS = {
        adjustment:function(g,x,y,s,p){g.newPath();g.ellipsePath(x,y,s,s);g.strokePath(p);g.newPath();g.moveTo(x+s/2,y);g.lineTo(x+s/2,y+s);g.strokePath(p);},
        flash:function(g,x,y,s,p){g.newPath();g.moveTo(x+s*.6,y);g.lineTo(x+s*.2,y+s*.55);g.lineTo(x+s*.5,y+s*.55);g.lineTo(x+s*.4,y+s);g.lineTo(x+s*.8,y+s*.4);g.lineTo(x+s*.5,y+s*.4);g.closePath();g.strokePath(p);},
        shake:function(g,x,y,s,p){g.newPath();g.moveTo(x,y+s*.5);g.lineTo(x+s*.25,y+s*.15);g.lineTo(x+s*.5,y+s*.85);g.lineTo(x+s*.75,y+s*.15);g.lineTo(x+s,y+s*.5);g.strokePath(p);},
        zoomIn:function(g,x,y,s,p){g.newPath();g.ellipsePath(x,y,s*.7,s*.7);g.strokePath(p);g.newPath();g.moveTo(x+s*.6,y+s*.6);g.lineTo(x+s,y+s);g.strokePath(p);g.newPath();g.moveTo(x+s*.2,y+s*.35);g.lineTo(x+s*.5,y+s*.35);g.strokePath(p);g.newPath();g.moveTo(x+s*.35,y+s*.2);g.lineTo(x+s*.35,y+s*.5);g.strokePath(p);},
        zoomOut:function(g,x,y,s,p){g.newPath();g.ellipsePath(x,y,s*.7,s*.7);g.strokePath(p);g.newPath();g.moveTo(x+s*.6,y+s*.6);g.lineTo(x+s,y+s);g.strokePath(p);g.newPath();g.moveTo(x+s*.2,y+s*.35);g.lineTo(x+s*.5,y+s*.35);g.strokePath(p);},
        punch:function(g,x,y,s,p){g.newPath();g.moveTo(x,y+s*.5);g.lineTo(x+s*.35,y+s*.5);g.moveTo(x+s*.25,y+s*.3);g.lineTo(x+s*.35,y+s*.5);g.lineTo(x+s*.25,y+s*.7);g.moveTo(x+s,y+s*.5);g.lineTo(x+s*.65,y+s*.5);g.moveTo(x+s*.75,y+s*.3);g.lineTo(x+s*.65,y+s*.5);g.lineTo(x+s*.75,y+s*.7);g.strokePath(p);},
        rgb:function(g,x,y,s,p){g.newPath();g.ellipsePath(x,y+s*.15,s*.6,s*.6);g.strokePath(p);g.newPath();g.ellipsePath(x+s*.4,y+s*.15,s*.6,s*.6);g.strokePath(p);g.newPath();g.ellipsePath(x+s*.2,y+s*.4,s*.6,s*.6);g.strokePath(p);},
        glow:function(g,x,y,s,p){g.newPath();g.ellipsePath(x+s*.25,y+s*.25,s*.5,s*.5);g.strokePath(p);var c=[[.5,0,.5,.15],[.5,.85,.5,1],[0,.5,.15,.5],[.85,.5,1,.5]];for(var i=0;i<c.length;i++){g.newPath();g.moveTo(x+s*c[i][0],y+s*c[i][1]);g.lineTo(x+s*c[i][2],y+s*c[i][3]);g.strokePath(p);}},
        freeze:function(g,x,y,s,p){g.newPath();g.rectPath(x,y,s,s);g.strokePath(p);g.newPath();g.moveTo(x+s*.35,y+s*.25);g.lineTo(x+s*.35,y+s*.75);g.strokePath(p);g.newPath();g.moveTo(x+s*.65,y+s*.25);g.lineTo(x+s*.65,y+s*.75);g.strokePath(p);},
        lines:function(g,x,y,s,p){var c=[[0,0],[s,0],[0,s],[s,s],[s*.5,0],[0,s*.5],[s,s*.5],[s*.5,s]];for(var i=0;i<c.length;i++){g.newPath();var mx=x+s*.5+(c[i][0]-s*.5)*.45,my=y+s*.5+(c[i][1]-s*.5)*.45;g.moveTo(mx,my);g.lineTo(x+c[i][0],y+c[i][1]);g.strokePath(p);}},
        precomp:function(g,x,y,s,p){g.newPath();g.rectPath(x,y+s*.2,s*.8,s*.8);g.strokePath(p);g.newPath();g.rectPath(x+s*.2,y,s*.8,s*.8);g.strokePath(p);},
        folder:function(g,x,y,s,p){g.newPath();g.moveTo(x,y+s*.25);g.lineTo(x+s*.35,y+s*.25);g.lineTo(x+s*.45,y+s*.4);g.lineTo(x+s,y+s*.4);g.lineTo(x+s,y+s);g.lineTo(x,y+s);g.closePath();g.strokePath(p);},
        gear:function(g,x,y,s,p){g.newPath();g.ellipsePath(x+s*.25,y+s*.25,s*.5,s*.5);g.strokePath(p);var t=[[.5,0,.5,.2],[.5,.8,.5,1],[0,.5,.2,.5],[.8,.5,1,.5]];for(var i=0;i<t.length;i++){g.newPath();g.moveTo(x+s*t[i][0],y+s*t[i][1]);g.lineTo(x+s*t[i][2],y+s*t[i][3]);g.strokePath(p);}},
        // NEW
        typewriter:function(g,x,y,s,p){g.newPath();g.rectPath(x,y+s*.6,s,s*.4);g.strokePath(p);var keys=[[.1,.3],[.4,.3],[.7,.3],[.25,.1],[.55,.1]];for(var i=0;i<keys.length;i++){g.newPath();g.rectPath(x+s*keys[i][0],y+s*keys[i][1],s*.18,s*.18);g.strokePath(p);}},
        fadeup:function(g,x,y,s,p){g.newPath();g.moveTo(x+s*.5,y);g.lineTo(x+s*.5,y+s*.7);g.strokePath(p);g.newPath();g.moveTo(x+s*.3,y+s*.25);g.lineTo(x+s*.5,y);g.lineTo(x+s*.7,y+s*.25);g.strokePath(p);g.newPath();g.rectPath(x,y+s*.8,s,s*.2);g.strokePath(p);},
        bounce:function(g,x,y,s,p){g.newPath();g.moveTo(x+s*.2,y+s);g.curveTo(x+s*.2,y+s*.4,x+s*.5,y,x+s*.5,y+s*.4);g.curveTo(x+s*.5,y,x+s*.8,y+s*.4,x+s*.8,y+s);g.strokePath(p);},
        glitch:function(g,x,y,s,p){g.newPath();g.rectPath(x,y+s*.1,s*.7,s*.2);g.strokePath(p);g.newPath();g.rectPath(x+s*.1,y+s*.4,s*.8,s*.2);g.strokePath(p);g.newPath();g.rectPath(x,y+s*.7,s*.6,s*.2);g.strokePath(p);},
        slide:function(g,x,y,s,p){g.newPath();g.moveTo(x,y+s*.5);g.lineTo(x+s*.7,y+s*.5);g.strokePath(p);g.newPath();g.moveTo(x+s*.5,y+s*.25);g.lineTo(x+s*.7,y+s*.5);g.lineTo(x+s*.5,y+s*.75);g.strokePath(p);g.newPath();g.rectPath(x+s*.75,y+s*.2,s*.25,s*.6);g.strokePath(p);},
        word:function(g,x,y,s,p){var ys=[.15,.45,.75];for(var i=0;i<ys.length;i++){g.newPath();g.rectPath(x,y+s*ys[i],s*(i===1?.9:.7),s*.15);g.strokePath(p);}},
        sound:function(g,x,y,s,p){g.newPath();g.rectPath(x+s*.1,y+s*.25,s*.2,s*.5);g.strokePath(p);g.newPath();g.moveTo(x+s*.3,y+s*.15);g.lineTo(x+s*.6,y);g.lineTo(x+s*.6,y+s);g.lineTo(x+s*.3,y+s*.85);g.closePath();g.strokePath(p);g.newPath();g.moveTo(x+s*.7,y+s*.3);g.curveTo(x+s*1.0,y+s*.3,x+s*1.0,y+s*.7,x+s*.7,y+s*.7);g.strokePath(p);},
        grain:function(g,x,y,s,p){for(var i=0;i<8;i++){g.newPath();var px=x+Math.sin(i*67)*s*.4+s*.5,py=y+Math.cos(i*43)*s*.4+s*.5;g.ellipsePath(px-1,py-1,2,2);g.strokePath(p);}},
        vignette:function(g,x,y,s,p){g.newPath();g.rectPath(x,y,s,s);g.strokePath(p);g.newPath();g.ellipsePath(x+s*.15,y+s*.15,s*.7,s*.7);g.strokePath(p);},
        leak:function(g,x,y,s,p){g.newPath();g.moveTo(x,y+s*.5);for(var i=1;i<8;i++){var wave=Math.sin(i*0.9)*s*.15;g.lineTo(x+s*i/7,y+s*.5+wave);}g.strokePath(p);},
        vhs:function(g,x,y,s,p){g.newPath();g.rectPath(x,y,s,s);g.strokePath(p);for(var i=1;i<4;i++){g.newPath();var offset=(i%2===0)?s*.05:-s*.05;g.moveTo(x+offset,y+s*i/4);g.lineTo(x+s+offset,y+s*i/4);g.strokePath(p);}},
        scan:function(g,x,y,s,p){for(var i=0;i<4;i++){g.newPath();g.moveTo(x,y+s*i/3.5);g.lineTo(x+s,y+s*i/3.5);g.strokePath(p);}},
        flare:function(g,x,y,s,p){g.newPath();g.ellipsePath(x+s*.3,y+s*.3,s*.4,s*.4);g.strokePath(p);var rays=[[0,0],[1,0],[0,1],[1,1],[.5,0],[.5,1],[0,.5],[1,.5]];for(var i=0;i<rays.length;i++){g.newPath();var rx=x+s*.5+(rays[i][0]-0.5)*s*.3,ry=y+s*.5+(rays[i][1]-0.5)*s*.3;g.moveTo(rx,ry);g.lineTo(x+rays[i][0]*s,y+rays[i][1]*s);g.strokePath(p);}},
        dust:function(g,x,y,s,p){g.newPath();g.moveTo(x+s*.3,y);g.lineTo(x+s*.31,y+s);g.strokePath(p);g.newPath();g.moveTo(x+s*.7,y+s*.1);g.lineTo(x+s*.68,y+s*.9);g.strokePath(p);g.newPath();g.moveTo(x+s*.1,y+s*.3);g.lineTo(x+s*.12,y+s*.8);g.strokePath(p);},
        tint:function(g,x,y,s,p){g.newPath();g.ellipsePath(x,y,s,s);g.strokePath(p);g.newPath();g.moveTo(x,y+s*.5);g.lineTo(x+s,y+s*.5);g.strokePath(p);},
        ai:function(g,x,y,s,p){g.newPath();g.rectPath(x,y,s,s*.75);g.strokePath(p);g.newPath();g.moveTo(x+s*.3,y+s*.75);g.lineTo(x+s*.15,y+s);g.lineTo(x+s*.45,y+s*.75);g.closePath();g.strokePath(p);g.newPath();g.ellipsePath(x+s*.22,y+s*.25,s*.12,s*.12);g.strokePath(p);g.newPath();g.ellipsePath(x+s*.66,y+s*.25,s*.12,s*.12);g.strokePath(p);},
        send:function(g,x,y,s,p){g.newPath();g.moveTo(x,y+s*.5);g.lineTo(x+s,y);g.lineTo(x+s*.65,y+s*.5);g.lineTo(x+s,y+s);g.closePath();g.strokePath(p);},
        trash:function(g,x,y,s,p){g.newPath();g.rectPath(x+s*.2,y+s*.25,s*.6,s*.7);g.strokePath(p);g.newPath();g.moveTo(x,y+s*.2);g.lineTo(x+s,y+s*.2);g.strokePath(p);g.newPath();g.moveTo(x+s*.35,y+s*.05);g.lineTo(x+s*.65,y+s*.05);g.lineTo(x+s*.65,y+s*.2);g.lineTo(x+s*.35,y+s*.2);g.closePath();g.strokePath(p);g.newPath();g.moveTo(x+s*.35,y+s*.4);g.lineTo(x+s*.35,y+s*.8);g.strokePath(p);g.newPath();g.moveTo(x+s*.65,y+s*.4);g.lineTo(x+s*.65,y+s*.8);g.strokePath(p);},
        combo:function(g,x,y,s,p){g.newPath();g.ellipsePath(x,y,s*.55,s*.55);g.strokePath(p);g.newPath();g.ellipsePath(x+s*.45,y+s*.45,s*.55,s*.55);g.strokePath(p);},
        gradeIcon:function(g,x,y,s,p){g.newPath();g.ellipsePath(x,y,s,s);g.strokePath(p);g.newPath();g.moveTo(x+s/2,y);g.lineTo(x+s/2,y+s);g.strokePath(p);g.newPath();g.moveTo(x,y+s/2);g.lineTo(x+s,y+s/2);g.strokePath(p);},
        captionIcon:function(g,x,y,s,p){g.newPath();g.rectPath(x,y+s*.15,s,s*.55);g.strokePath(p);g.newPath();g.rectPath(x+s*.15,y+s*.85,s*.7,s*.12);g.strokePath(p);},
        marker:function(g,x,y,s,p){g.newPath();g.moveTo(x+s*.5,y);g.lineTo(x+s,y+s*.35);g.lineTo(x+s*.5,y+s*.7);g.lineTo(x,y+s*.35);g.closePath();g.strokePath(p);g.newPath();g.moveTo(x+s*.5,y+s*.7);g.lineTo(x+s*.5,y+s);g.strokePath(p);},
        beat:function(g,x,y,s,p){var bars=[.3,.7,.45,.9,.6];for(var i=0;i<bars.length;i++){g.newPath();g.moveTo(x+s*i/(bars.length-1),y+s);g.lineTo(x+s*i/(bars.length-1),y+s*(1-bars[i]));g.strokePath(p);}},
        renderIcon:function(g,x,y,s,p){g.newPath();g.rectPath(x,y,s,s*.75);g.strokePath(p);g.newPath();g.moveTo(x+s*.35,y+s*.85);g.lineTo(x+s*.5,y+s);g.lineTo(x+s*.65,y+s*.85);g.strokePath(p);g.newPath();g.moveTo(x+s*.5,y+s*.15);g.lineTo(x+s*.5,y+s*.95);g.strokePath(p);},
        searchIcon:function(g,x,y,s,p){g.newPath();g.ellipsePath(x,y,s*.65,s*.65);g.strokePath(p);g.newPath();g.moveTo(x+s*.55,y+s*.55);g.lineTo(x+s,y+s);g.strokePath(p);},
        whip:function(g,x,y,s,p){g.newPath();g.moveTo(x,y+s*.5);g.lineTo(x+s*.7,y+s*.5);g.strokePath(p);g.newPath();g.moveTo(x+s*.5,y+s*.25);g.lineTo(x+s*.8,y+s*.5);g.lineTo(x+s*.5,y+s*.75);g.strokePath(p);for(var i=0;i<3;i++){g.newPath();g.moveTo(x+s*.05,y+s*(.3+i*.05));g.lineTo(x+s*.3,y+s*(.3+i*.05));g.strokePath(p);}},
        spin:function(g,x,y,s,p){g.newPath();g.ellipsePath(x+s*.15,y+s*.15,s*.7,s*.7);g.strokePath(p);g.newPath();g.moveTo(x+s*.85,y+s*.5);g.lineTo(x+s,y+s*.35);g.lineTo(x+s*.95,y+s*.6);g.closePath();g.strokePath(p);},
        warp:function(g,x,y,s,p){for(var i=0;i<4;i++){g.newPath();var yy=y+s*i/3;g.moveTo(x,yy);g.curveTo(x+s*.33,yy+s*.12,x+s*.66,yy-s*.12,x+s,yy);g.strokePath(p);}}
    };

    // ============================================================
    //  CUSTOM BUTTON WIDGETS
    // ============================================================

    var allButtons = [], allHeaders = [], allDescs = [], soundListbox = null;

    /**
     * Safely requests a redraw of a custom-drawn element.
     * `notify("onDraw")` is not available on groups in every AE version
     * (and fails before the panel is shown), so guard every call.
     */
    function safeRedraw(el) {
        try {
            if (el && typeof el.notify === "function") el.notify("onDraw");
        } catch (e) { /* element not yet drawable — ignore */ }
    }

    /**
     * A real ScriptUI `button` (always clickable, even in narrow docked
     * panels) with a custom-drawn icon + label, followed by a small grey
     * description line explaining what the action does.
     */
    function featureButton(parent, label, iconName, desc, onClick) {
        var col = parent.add("group");
        col.orientation = "column";
        col.alignChildren = ["fill","top"];
        col.spacing = 1;
        col.alignment = ["fill","top"];

        var btn = col.add("button", undefined, "");
        btn.alignment = ["fill","top"];
        btn.preferredSize = [-1, 28];
        btn.helpTip = desc;
        btn._label = label; btn._icon = iconName;
        btn._hover = false;

        btn.onDraw = function() {
            var g = this.graphics, th = theme(), ac = accent();
            var w = this.size[0], h = this.size[1];
            var bg = this._hover ? th.btnHover : th.panel;
            g.newPath(); g.rectPath(0,0,w,h);
            g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR,[bg[0],bg[1],bg[2],1]));
            g.newPath(); g.rectPath(0,0,3,h);
            g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR,[ac[0],ac[1],ac[2],1]));
            var pen = g.newPen(g.PenType.SOLID_COLOR,[ac[0],ac[1],ac[2],1],1.5);
            var is=14, ix=10, iy=(h-is)/2;
            if(ICONS[this._icon]) ICONS[this._icon](g,ix,iy,is,pen);
            var font = ScriptUI.newFont("Tahoma",ScriptUI.FontStyle.REGULAR,12);
            g.drawString(this._label,
                g.newPen(g.PenType.SOLID_COLOR,[th.text[0],th.text[1],th.text[2],1],1),
                32,(h-14)/2,font);
        };
        btn.addEventListener("mouseover",function(){this._hover=true; safeRedraw(this);});
        btn.addEventListener("mouseout", function(){this._hover=false; safeRedraw(this);});
        btn.onClick = onClick;

        var d = col.add("statictext", undefined, desc, {multiline:true});
        d.alignment = ["fill","top"];
        d._isDesc = true;
        try {
            d.graphics.font = ScriptUI.newFont("Tahoma", ScriptUI.FontStyle.REGULAR, 9);
        } catch(e) {}

        allButtons.push(btn);
        allDescs.push(d);
        return col;
    }

    function sectionHeader(parent, title) {
        var grp = parent.add("group");
        grp.alignment = ["fill","top"]; grp.preferredSize = [240,16]; grp._title = title;
        grp.onDraw = function() {
            var g=this.graphics, ac=accent(), th=theme();
            var font=ScriptUI.newFont("Tahoma",ScriptUI.FontStyle.BOLD,10);
            g.drawString(this._title,g.newPen(g.PenType.SOLID_COLOR,[ac[0],ac[1],ac[2],1],1),0,1,font);
            g.newPath();g.moveTo(0,14);g.lineTo(this.size[0],14);
            g.strokePath(g.newPen(g.PenType.SOLID_COLOR,[th.subtext[0],th.subtext[1],th.subtext[2],.4],1));
        };
        allHeaders.push(grp);
        return grp;
    }

    // ============================================================
    //  SETTINGS DIALOG
    // ============================================================

    function openSettingsDialog(mainPanel) {
        var dlg = new Window("dialog", SCRIPT_NAME+" — Paramètres");
        dlg.orientation="column"; dlg.alignChildren=["fill","top"]; dlg.spacing=10; dlg.margins=14;

        var pTheme = dlg.add("panel",undefined,"Apparence");
        pTheme.orientation="column"; pTheme.alignChildren=["left","top"]; pTheme.margins=12;
        var gTheme = pTheme.add("group");
        gTheme.add("statictext",undefined,"Thème :");
        var rbDark  = gTheme.add("radiobutton",undefined,"Dark");
        var rbLight = gTheme.add("radiobutton",undefined,"Light");
        (settings.theme==="light"?rbLight:rbDark).value=true;
        var gAcc = pTheme.add("group");
        gAcc.add("statictext",undefined,"Accent :");
        var names=[]; for(var k=0;k<ACCENT_PRESETS.length;k++) names.push(ACCENT_PRESETS[k].name);
        var ddAcc = gAcc.add("dropdownlist",undefined,names); ddAcc.selection=0;
        for(var k=0;k<ACCENT_PRESETS.length;k++) if(ACCENT_PRESETS[k].hex===settings.accent) ddAcc.selection=k;
        var gHex = pTheme.add("group");
        gHex.add("statictext",undefined,"Hex custom :");
        var etHex = gHex.add("edittext",undefined,settings.accent); etHex.characters=9;

        var pZoom = dlg.add("panel",undefined,"Smooth Zoom");
        pZoom.orientation="column"; pZoom.alignChildren=["left","top"]; pZoom.margins=12;
        var gAmt = pZoom.add("group");
        gAmt.add("statictext",undefined,"Intensité (%) :"); var etAmt=gAmt.add("edittext",undefined,String(settings.zoomAmount)); etAmt.characters=5;
        var gDur = pZoom.add("group");
        gDur.add("statictext",undefined,"Durée (frames) :"); var etDur=gDur.add("edittext",undefined,String(settings.zoomFrames)); etDur.characters=5;

        var pLic = dlg.add("panel",undefined,"Licence");
        pLic.orientation="column"; pLic.alignChildren=["fill","top"]; pLic.margins=12;
        var licLbl = pLic.add("statictext",undefined,isLicensed()?"✓ Licence activée":"Mode essai — entrez votre clé");
        var gKey = pLic.add("group");
        var etKey = gKey.add("edittext",undefined,settings.licenseKey); etKey.characters=22;
        var btnAct = gKey.add("button",undefined,"Activer");
        btnAct.onClick = function() {
            if(validateLicenseKey(etKey.text)){
                settings.licenseKey=etKey.text.toUpperCase().replace(/\s/g,"");
                saveSetting("licenseKey",settings.licenseKey);
                licLbl.text="✓ Licence activée";
                alert(SCRIPT_NAME+"\n\nLicence activée. Merci !");
            } else alert(SCRIPT_NAME+"\n\nClé invalide (format EHP-XXXX-XXXX-XXXX).");
        };

        var pAI = dlg.add("panel",undefined,"AI Assistant (optionnel)");
        pAI.orientation="column"; pAI.alignChildren=["left","top"]; pAI.margins=12;
        pAI.add("statictext",undefined,"Adresse du bridge IA local (host:port) :");
        var etBridge = pAI.add("edittext",undefined,settings.aiBridgeHost); etBridge.characters=22;
        var bridgeNote = pAI.add("statictext",undefined,
            "Laissez vide pour utiliser l'assistant local (mots-clés).\nVoir README.md → section « AI Bridge ».",
            {multiline:true});

        var gBtns=dlg.add("group"); gBtns.alignment=["right","top"];
        gBtns.add("button",undefined,"Annuler").onClick=function(){dlg.close();};
        gBtns.add("button",undefined,"Enregistrer").onClick=function(){
            settings.theme=rbLight.value?"light":"dark";
            var hex=etHex.text.replace(/\s/g,"");
            if(/^#?[0-9A-Fa-f]{6}$/.test(hex)) settings.accent=(hex[0]==="#"?hex:"#"+hex).toUpperCase();
            else if(ddAcc.selection!==null) settings.accent=ACCENT_PRESETS[ddAcc.selection.index].hex;
            var amt=parseFloat(etAmt.text), dur=parseInt(etDur.text,10);
            if(!isNaN(amt)&&amt>0&&amt<=200) settings.zoomAmount=amt;
            if(!isNaN(dur)&&dur>0&&dur<=120) settings.zoomFrames=dur;
            settings.aiBridgeHost = etBridge.text.replace(/\s/g,"");
            saveSetting("theme",settings.theme); saveSetting("accent",settings.accent);
            saveSetting("zoomAmount",settings.zoomAmount); saveSetting("zoomFrames",settings.zoomFrames);
            saveSetting("aiBridgeHost",settings.aiBridgeHost);
            applyTheme(mainPanel); dlg.close();
        };
        dlg.center(); dlg.show();
    }

    function applyTheme(panel) {
        var th=theme();
        try { panel.graphics.backgroundColor=panel.graphics.newBrush(panel.graphics.BrushType.SOLID_COLOR,th.bg); } catch(e){}
        for(var i=0;i<allButtons.length;i++) safeRedraw(allButtons[i]);
        for(var j=0;j<allHeaders.length;j++) safeRedraw(allHeaders[j]);
        for(var k=0;k<allDescs.length;k++) {
            try {
                var d = allDescs[k];
                d.graphics.foregroundColor = d.graphics.newPen(
                    d.graphics.PenType.SOLID_COLOR,
                    [th.subtext[0],th.subtext[1],th.subtext[2],1], 1);
            } catch(e) {}
        }
        if(panel.layout) panel.layout.layout(true);
    }

    // ============================================================
    //  SOUND BANK PANEL (built inside a tab)
    // ============================================================

    function buildSoundsTab(parent) {
        var grp = parent.add("group");
        grp.orientation="column"; grp.alignChildren=["fill","top"]; grp.spacing=6; grp.margins=8;

        sectionHeader(grp, "MARQUEURS");
        featureButton(grp,"Auto Music Markers","marker",
            "Place des marqueurs de composition à chaque temps (beat) selon le BPM, sur toute la durée de la comp.",
            autoMusicMarkers);

        sectionHeader(grp, "BEAT SYNC");
        featureButton(grp,"Flash on Every Beat","beat",
            "Ajoute un flash blanc (6 frames) sur chaque marqueur de la composition.",
            function(){beatFlash("white");});
        featureButton(grp,"Shake on Markers","beat",
            "Ajoute un Quick Shake Medium non destructif sur chaque marqueur.",
            function(){beatShake(15,30,"Medium");});
        featureButton(grp,"Zoom Punch on Beats","beat",
            "Applique un Punch In→Out sur les calques sélectionnés à chaque marqueur.",
            beatZoomPunch);
        featureButton(grp,"RGB Split on First Beat","beat",
            "Applique le RGB Split sur les calques sélectionnés au premier marqueur (évite les doublons).",
            beatRGBSplitOnce);
        featureButton(grp,"Anime Beat Pack","beat",
            "Combo : Flash + Shake Medium + Zoom Punch (si sélection) sur chaque marqueur.",
            beatAnimePack);

        sectionHeader(grp, "DOSSIER DE SONS");

        var rowPath = grp.add("group");
        rowPath.orientation="row"; rowPath.alignment=["fill","top"]; rowPath.spacing=4;
        var etPath = rowPath.add("edittext",undefined, settings.soundFolder||"(aucun dossier)");
        etPath.alignment=["fill","center"]; etPath.enabled=false; etPath.characters=22;
        var btnBrowse = rowPath.add("button",undefined,"...");
        btnBrowse.preferredSize=[28,22];

        sectionHeader(grp, "FICHIERS AUDIO");

        var lb = grp.add("listbox",[0,0,215,180]);
        lb.alignment=["fill","top"]; soundListbox=lb;

        var rowBtns = grp.add("group");
        rowBtns.orientation="row"; rowBtns.alignment=["fill","top"]; rowBtns.spacing=4;
        var btnAdd     = rowBtns.add("button",undefined,"Ajouter à la comp");
        var btnRefresh = rowBtns.add("button",undefined,"↺");
        btnRefresh.preferredSize=[28,22];

        // Populate listbox
        function refreshList() {
            lb.removeAll();
            var files=getSoundFiles();
            for(var i=0;i<files.length;i++){
                var name=files[i] instanceof File ? files[i].name : String(files[i]).replace(/.*[\/\\]/,"");
                var item=lb.add("item",name);
                item._path = files[i] instanceof File ? files[i].fsName : String(files[i]);
            }
        }

        btnBrowse.onClick = function() {
            var folder = Folder.selectDialog("Sélectionnez votre dossier de sons");
            if(folder){
                settings.soundFolder=folder.fsName;
                saveSetting("soundFolder",settings.soundFolder);
                etPath.text=settings.soundFolder;
                refreshList();
            }
        };
        btnRefresh.onClick=refreshList;
        btnAdd.onClick=function(){
            if(!lb.selection){ alert(SCRIPT_NAME+"\n\nSélectionnez un fichier dans la liste."); return; }
            addSoundToComp(lb.selection._path);
        };

        // Double-click to add immediately
        lb.onDoubleClick = function() { if(lb.selection) addSoundToComp(lb.selection._path); };

        if(settings.soundFolder) refreshList();
    }

    // ============================================================
    //  CHAT / AI ASSISTANT TAB
    // ============================================================

    function buildChatTab(parent) {
        var grp = parent.add("group");
        grp.orientation="column"; grp.alignChildren=["fill","top"]; grp.spacing=6; grp.margins=8;

        sectionHeader(grp, "ASSISTANT IA");

        var info = grp.add("statictext", undefined,
            "Décrivez l'effet souhaité en langage naturel "+
            "(ex : \"ajoute un white flash\", \"zoom in sur la sélection\", "+
            "\"glitch sur le texte\"). L'assistant exécute l'action "+
            "directement dans After Effects.",
            {multiline:true});
        info.alignment=["fill","top"];
        try { info.graphics.font = ScriptUI.newFont("Tahoma", ScriptUI.FontStyle.REGULAR, 9); } catch(e){}

        var log = grp.add("edittext", undefined, "", {multiline:true, scrollable:true, readonly:true});
        log.alignment=["fill","fill"];
        log.preferredSize=[0,160];

        function appendLog(who, text) {
            log.text = (log.text ? log.text + "\n\n" : "") + who + " : " + text;
            // Scroll to bottom by re-selecting all then collapsing selection
            try { log.textselection = log.text.length; } catch(e) {}
        }

        var rowInput = grp.add("group");
        rowInput.orientation="row"; rowInput.alignment=["fill","top"]; rowInput.spacing=4;
        var input = rowInput.add("edittext", undefined, "");
        input.alignment=["fill","center"];

        var btnSend = rowInput.add("button", undefined, "");
        btnSend.preferredSize=[34,26];
        btnSend._icon="send";
        btnSend.onDraw = function() {
            var g=this.graphics, ac=accent(), th=theme();
            g.newPath(); g.rectPath(0,0,this.size[0],this.size[1]);
            g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR,[ac[0],ac[1],ac[2],1]));
            var pen=g.newPen(g.PenType.SOLID_COLOR,[1,1,1,1],1.5);
            ICONS.send(g, (this.size[0]-12)/2, (this.size[1]-12)/2, 12, pen);
        };
        allButtons.push(btnSend);

        function send() {
            var msg = input.text.replace(/^\s+|\s+$/g,"");
            if (!msg) return;
            appendLog("Vous", msg);
            input.text = "";
            var reply = processAssistantMessage(msg);
            appendLog("Assistant", reply);
        }
        btnSend.onClick = send;
        input.addEventListener("keydown", function(ev) {
            if (ev.keyName === "Enter" || ev.keyName === "Return") { send(); ev.preventDefault(); }
        });

        appendLog("Assistant",
            "Bonjour ! Dites-moi quel effet ajouter (white flash, zoom in, "+
            "glitch texte, light leak…) et je l'applique directement sur "+
            "votre composition.");
    }

    // ============================================================
    //  MAIN UI — TABBED PANEL
    // ============================================================

    function buildUI(thisObj) {
        var panel = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", SCRIPT_NAME, undefined, { resizeable:true });

        panel.orientation="column"; panel.alignChildren=["fill","top"];
        panel.spacing=6; panel.margins=[8,8,8,6];

        // ---- Tabbed area ----
        var tabs = panel.add("tabbedpanel");
        tabs.alignment=["fill","fill"];

        // ---- TAB 1: EDIT ----
        var tabEdit = tabs.add("tab",undefined,"Edit");
        tabEdit.orientation="column"; tabEdit.alignChildren=["fill","top"]; tabEdit.spacing=5; tabEdit.margins=6;

        sectionHeader(tabEdit, "LAYERS");
        featureButton(tabEdit,"Adjustment Layer","adjustment",
            "Crée un calque d'ajustement (EH_Adjustment) au-dessus de la sélection, ou sur toute la comp si rien n'est sélectionné.",
            createAdjustmentLayer);
        featureButton(tabEdit,"White Flash","flash",
            "Ajoute un flash blanc de 6 frames au temps courant, opacité 100% → 0%.",
            function(){createFlash("white");});
        featureButton(tabEdit,"Black Flash","flash",
            "Ajoute un flash noir de 6 frames au temps courant, opacité 100% → 0%.",
            function(){createFlash("black");});

        sectionHeader(tabEdit, "ZOOMS");
        featureButton(tabEdit,"Smooth Zoom In","zoomIn",
            "Zoom avant progressif et adouci sur les calques sélectionnés (intensité réglable dans Settings).",
            function(){smoothZoom("in");});
        featureButton(tabEdit,"Smooth Zoom Out","zoomOut",
            "Zoom arrière progressif et adouci sur les calques sélectionnés.",
            function(){smoothZoom("out");});
        featureButton(tabEdit,"Punch Out → In","punch",
            "Effet de recul : zoom arrière puis retour à l'échelle d'origine.",
            function(){smoothZoom("outin");});
        featureButton(tabEdit,"Punch In → Out","punch",
            "Effet d'impact : zoom avant puis retour à l'échelle d'origine.",
            function(){smoothZoom("inout");});

        sectionHeader(tabEdit, "SHAKES");
        featureButton(tabEdit,"Shake Light","shake",
            "Petit shake non destructif (calque d'ajustement, 10 frames).",
            function(){quickShake(10,15,"Light");});
        featureButton(tabEdit,"Shake Medium","shake",
            "Shake moyen non destructif (calque d'ajustement, 10 frames).",
            function(){quickShake(15,30,"Medium");});
        featureButton(tabEdit,"Shake Heavy","shake",
            "Gros shake non destructif (calque d'ajustement, 10 frames).",
            function(){quickShake(20,50,"Heavy");});
        featureButton(tabEdit,"Impact Shake (expression)","shake",
            "Applique wiggle(18, 35) directement sur la Position des calques sélectionnés.",
            impactShake);

        sectionHeader(tabEdit, "EFFECTS");
        featureButton(tabEdit,"RGB Split","rgb",
            "Sépare les canaux R/G/B du calque sélectionné en 3 copies décalées (Shift Channels + Add).",
            rgbSplit);
        featureButton(tabEdit,"Glow Boost","glow",
            "Ajoute l'effet Glow natif (Threshold 60, Radius 35, Intensity 1.5).",
            glowBoost);
        featureButton(tabEdit,"Speed Lines","lines",
            "Crée des lignes de vitesse radiales façon anime (Fractal Noise + Polar Coordinates).",
            speedLines);
        featureButton(tabEdit,"Freeze Frame","freeze",
            "Fige le calque sélectionné au temps courant (split + time remap hold).",
            freezeFrame);

        sectionHeader(tabEdit, "PROJECT");
        featureButton(tabEdit,"Auto Precomp Selected","precomp",
            "Précompose la sélection dans EH_Precomp_XX (auto-incrémenté).",
            autoPrecompSelected);
        featureButton(tabEdit,"Organize Project","folder",
            "Crée les dossiers standards et range tous les éléments du projet par type.",
            organizeProject);
        featureButton(tabEdit,"Clean EH_ Layers","trash",
            "Supprime tous les calques générés par le panel (préfixe EH_) dans la comp active.",
            removeEHLayers);
        featureButton(tabEdit,"Find Missing Footage","searchIcon",
            "Liste tous les médias manquants dans le projet.",
            findMissingFootage);
        featureButton(tabEdit,"Remove Unused Footage","trash",
            "Supprime (avec confirmation) tous les médias non utilisés dans le projet.",
            removeUnusedFootage);
        featureButton(tabEdit,"Add to Render Queue","renderIcon",
            "Ajoute la composition active à la Render Queue d'After Effects.",
            addToRenderQueue);

        // ---- TAB 2: TEXT ----
        var tabText = tabs.add("tab",undefined,"Text");
        tabText.orientation="column"; tabText.alignChildren=["fill","top"]; tabText.spacing=5; tabText.margins=6;

        var note = tabText.add("statictext",undefined,
            "⚠ Sélectionnez un calque de texte avant d'appliquer une animation.",
            {multiline:true});
        note.alignment=["fill","top"];

        sectionHeader(tabText,"REVEAL");
        featureButton(tabText,"Typewriter","typewriter",
            "Affiche le texte caractère par caractère (opacité, 24 frames).",
            textTypewriter);
        featureButton(tabText,"Fade Up","fadeup",
            "Les mots remontent de 40px en apparaissant en fondu (18 frames).",
            textFadeUp);
        featureButton(tabText,"Word Reveal","word",
            "Révèle le texte mot par mot en fondu (20 frames).",
            textWordReveal);
        featureButton(tabText,"Bounce In","bounce",
            "Les caractères rebondissent : scale 0% → 120% → 100% avec Easy Ease.",
            textBounceIn);

        sectionHeader(tabText,"SLIDES");
        featureButton(tabText,"Slide From Left","slide",
            "Le texte glisse depuis la gauche, ligne par ligne, en fondu.",
            function(){textSlide("left");});
        featureButton(tabText,"Slide From Right","slide",
            "Le texte glisse depuis la droite, ligne par ligne, en fondu.",
            function(){textSlide("right");});
        featureButton(tabText,"Slide From Top","slide",
            "Le texte glisse depuis le haut, ligne par ligne, en fondu.",
            function(){textSlide("top");});
        featureButton(tabText,"Slide From Bottom","slide",
            "Le texte glisse depuis le bas, ligne par ligne, en fondu.",
            function(){textSlide("bottom");});

        sectionHeader(tabText,"SPECIAL");
        featureButton(tabText,"Glitch Text","glitch",
            "Jitter de position + clignotement d'opacité par caractère, via expressions.",
            textGlitch);
        featureButton(tabText,"TikTok Caption Style","captionIcon",
            "Contour noir + ombre portée sur le texte sélectionné, plus une animation Bounce In.",
            captionStyle);

        // ---- TAB 3: SOUNDS ----
        var tabSounds = tabs.add("tab",undefined,"Sounds");
        buildSoundsTab(tabSounds);

        // ---- TAB 4: OVERLAYS ----
        var tabOverlays = tabs.add("tab",undefined,"Overlays");
        tabOverlays.orientation="column"; tabOverlays.alignChildren=["fill","top"]; tabOverlays.spacing=5; tabOverlays.margins=6;

        sectionHeader(tabOverlays,"TEXTURE");
        featureButton(tabOverlays,"Film Grain","grain",
            "Ajoute l'effet Add Grain natif sur un calque d'ajustement.",
            overlayFilmGrain);
        featureButton(tabOverlays,"Vignette","vignette",
            "Assombrit les bords avec un masque elliptique inversé et adouci.",
            overlayVignette);
        featureButton(tabOverlays,"Light Leak","leak",
            "Fuite de lumière chaude animée (Fractal Noise, mode Add).",
            overlayLightLeak);
        featureButton(tabOverlays,"Dust & Scratches","dust",
            "Rayures et poussière façon pellicule (Fractal Noise, mode Screen).",
            overlayDust);
        featureButton(tabOverlays,"Scanlines","scan",
            "Lignes de balayage façon écran CRT (effet Grid, mode Multiply).",
            overlayScanlines);
        featureButton(tabOverlays,"VHS Glitch","vhs",
            "Distorsion VHS : Wave Warp + Noise + désaturation (Hue/Saturation).",
            overlayVHS);

        sectionHeader(tabOverlays,"LIGHT");
        featureButton(tabOverlays,"Lens Flare","flare",
            "Reflet d'objectif natif, centré, en mode Add.",
            overlayLensFlare);

        sectionHeader(tabOverlays,"COLOR TINT");
        featureButton(tabOverlays,"Cinematic","tint",
            "Ombres bleutées, hautes lumières orangées (Tint natif).",
            function(){overlayColorTint([0.05,0.1,0.3],[1,0.9,0.7],"Cinematic");});
        featureButton(tabOverlays,"Anime Warm","tint",
            "Tons chauds et saturés façon anime.",
            function(){overlayColorTint([0.2,0.05,0.1],[1,0.95,0.7],"AnimeWarm");});
        featureButton(tabOverlays,"Night Blue","tint",
            "Ambiance nocturne froide et bleutée.",
            function(){overlayColorTint([0,0.05,0.2],[0.7,0.85,1],"NightBlue");});
        featureButton(tabOverlays,"Ski / Snow","tint",
            "Ciel clair et neige lumineuse, idéal edits ski/montagne.",
            function(){overlayColorTint([0.1,0.15,0.25],[0.95,0.98,1],"SkiSnow");});

        sectionHeader(tabOverlays,"COLOR GRADING");
        featureButton(tabOverlays,"Teal & Orange","gradeIcon",
            "Look cinéma classique : ombres bleu-vert, hautes lumières orangées + contraste.",
            gradeTealOrange);
        featureButton(tabOverlays,"Moody Cinematic","gradeIcon",
            "Tons sombres et désaturés, contraste élevé pour une ambiance dramatique.",
            gradeMoody);
        featureButton(tabOverlays,"Pastel Anime","gradeIcon",
            "Couleurs douces et lumineuses, saturation augmentée façon anime.",
            gradePastelAnime);
        featureButton(tabOverlays,"High Contrast B&W","gradeIcon",
            "Désaturation totale avec contraste renforcé.",
            gradeHighContrastBW);

        // ---- TAB 5: TEMPLATES ----
        var tabTemplates = tabs.add("tab",undefined,"Templates");
        tabTemplates.orientation="column"; tabTemplates.alignChildren=["fill","top"]; tabTemplates.spacing=5; tabTemplates.margins=6;

        sectionHeader(tabTemplates,"SEQUENCE TEMPLATES");
        featureButton(tabTemplates,"Intro Punch","combo",
            "Combo : Punch In-Out + Shake Medium + White Flash + Glow Boost.",
            templateIntroPunch);
        featureButton(tabTemplates,"Anime Impact","combo",
            "Combo : Black Flash + Speed Lines + Shake Heavy + Smooth Zoom In.",
            templateAnimeImpact);
        featureButton(tabTemplates,"Glitch Transition","combo",
            "Combo : RGB Split + VHS Glitch + Shake Medium.",
            templateGlitchTransition);
        featureButton(tabTemplates,"Cinematic Reveal","combo",
            "Combo : Smooth Zoom In + Tint Cinematic + Vignette + Film Grain.",
            templateCinematicReveal);

        // ---- TAB 6: TRANSITIONS ----
        var tabTransitions = tabs.add("tab",undefined,"Transitions");
        tabTransitions.orientation="column"; tabTransitions.alignChildren=["fill","top"]; tabTransitions.spacing=5; tabTransitions.margins=6;

        var noteT = tabTransitions.add("statictext",undefined,
            "⚠ Sélectionnez le(s) calque(s) à animer (sauf Flash Cut, Camera Shake et Warp/Distort, qui s'appliquent sur toute la comp).",
            {multiline:true});
        noteT.alignment=["fill","top"];

        sectionHeader(tabTransitions,"WHIP & SLIDE");
        featureButton(tabTransitions,"Whip Pan Left","whip",
            "Mouvement rapide du calque vers la gauche avec motion blur (8 frames).",
            function(){whipPan("left");});
        featureButton(tabTransitions,"Whip Pan Right","whip",
            "Mouvement rapide du calque vers la droite avec motion blur (8 frames).",
            function(){whipPan("right");});
        featureButton(tabTransitions,"Slide From Left","slide",
            "Le calque sort par la gauche avec motion blur (12 frames).",
            function(){slideMotionBlurTransition("left");});
        featureButton(tabTransitions,"Slide From Right","slide",
            "Le calque sort par la droite avec motion blur (12 frames).",
            function(){slideMotionBlurTransition("right");});
        featureButton(tabTransitions,"Slide From Top","slide",
            "Le calque sort par le haut avec motion blur (12 frames).",
            function(){slideMotionBlurTransition("up");});
        featureButton(tabTransitions,"Slide From Bottom","slide",
            "Le calque sort par le bas avec motion blur (12 frames).",
            function(){slideMotionBlurTransition("down");});

        sectionHeader(tabTransitions,"BLUR & SPIN");
        featureButton(tabTransitions,"Spin Blur Transition","spin",
            "Rotation rapide (2 tours) + scale-up avec motion blur (8 frames).",
            spinBlurTransition);
        featureButton(tabTransitions,"Zoom Blur Transition","zoomIn",
            "Scale rapide x4 avec motion blur (8 frames) — effet de zoom flou.",
            zoomBlurTransition);

        sectionHeader(tabTransitions,"GLITCH & IMPACT");
        featureButton(tabTransitions,"RGB Glitch Transition","rgb",
            "RGB Split + Wave Warp animé sur calque d'ajustement (8 frames).",
            rgbGlitchTransition);
        featureButton(tabTransitions,"Flash Cut","flash",
            "Flash blanc très court (2 frames) pour une coupe sèche.",
            flashCutTransition);
        featureButton(tabTransitions,"Camera Shake Transition","shake",
            "Secousse caméra intense et brève (calque d'ajustement, 10 frames).",
            cameraShakeTransition);
        featureButton(tabTransitions,"Warp / Distort Transition","warp",
            "Distorsion Turbulent Displace animée (montée puis retour, 8 frames).",
            warpDistortTransition);

        // ---- TAB 7: AI CHAT ----
        var tabChat = tabs.add("tab",undefined,"AI Chat");
        buildChatTab(tabChat);

        // ---- Footer (outside tabs) ----
        var footer = panel.add("group");
        footer.orientation="row"; footer.alignment=["fill","bottom"]; footer.spacing=6;

        var btnSettings = footer.add("button", undefined, "");
        btnSettings.preferredSize=[34,26];
        btnSettings.onDraw = function() {
            var g=this.graphics, ac=accent();
            g.newPath(); g.rectPath(0,0,this.size[0],this.size[1]);
            g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, theme().panel.concat(1)));
            var pen=g.newPen(g.PenType.SOLID_COLOR,[ac[0],ac[1],ac[2],1],1.5);
            ICONS.gear(g,(this.size[0]-14)/2,(this.size[1]-14)/2,14,pen);
        };
        btnSettings.helpTip = "Thème, couleurs, zoom, licence, AI Bridge.";
        btnSettings.onClick = function(){openSettingsDialog(panel);};
        allButtons.push(btnSettings);

        var verLbl = panel.add("statictext",undefined,
            "v"+SCRIPT_VERSION+(isLicensed()?"  •  ✓ Licensed":"  •  Trial"));
        verLbl.alignment=["right","bottom"];

        applyTheme(panel);

        if(panel instanceof Window){ panel.center(); panel.show(); }
        else { panel.layout.layout(true); }
        return panel;
    }

    buildUI(thisObj);

}(this));
