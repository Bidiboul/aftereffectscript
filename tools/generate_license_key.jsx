/**
 * License Key Generator — FXCore (SELLER ONLY — do not distribute)
 *
 * Run this in any ExtendScript host (or AE: File > Scripts > Run Script File)
 * to generate valid keys in the format FXC-XXXX-XXXX-CCCC.
 * Uses the same checksum algorithm as FXCore.jsx.
 */
(function () {
    function computeChecksum(payload) {
        var sum = 0;
        for (var i = 0; i < payload.length; i++) {
            sum += payload.charCodeAt(i) * (i + 7);
        }
        var c = (sum % 9973).toString(36).toUpperCase();
        while (c.length < 4) c = "0" + c;
        return c;
    }

    function randomBlock() {
        var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
        var s = "";
        for (var i = 0; i < 4; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
        return s;
    }

    var count = 5; // how many keys to generate
    var out = [];
    for (var i = 0; i < count; i++) {
        var a = randomBlock(), b = randomBlock();
        out.push("FXC-" + a + "-" + b + "-" + computeChecksum(a + b));
    }
    alert("Generated license keys:\n\n" + out.join("\n"));
})();
