import os from 'node:os';
import { createRequire } from 'node:module';
var require = createRequire(import.meta.url);
var qrcode = require('qrcode-terminal');
function isLanIPv4(net) {
    if (net.internal)
        return false;
    var fam = net.family;
    return fam === 'IPv4' || fam === 4;
}
/** First non-internal IPv4 (typical Wi‑Fi / Ethernet on the LAN). */
export function getLanIPv4() {
    var _a;
    var nets = os.networkInterfaces();
    for (var _i = 0, _b = Object.keys(nets); _i < _b.length; _i++) {
        var name_1 = _b[_i];
        for (var _c = 0, _d = (_a = nets[name_1]) !== null && _a !== void 0 ? _a : []; _c < _d.length; _c++) {
            var net = _d[_c];
            if (isLanIPv4(net))
                return net.address;
        }
    }
    return null;
}
export function lanQrPlugin() {
    return {
        name: 'lan-qr',
        configureServer: function (server) {
            var _a;
            (_a = server.httpServer) === null || _a === void 0 ? void 0 : _a.once('listening', function () {
                var _a;
                var addr = (_a = server.httpServer) === null || _a === void 0 ? void 0 : _a.address();
                var port = typeof addr === 'object' && addr && 'port' in addr && addr.port != null ? addr.port : 5173;
                var ip = getLanIPv4();
                if (!ip) {
                    console.log("\n\u001B[33m[LAN]\u001B[0m No LAN IPv4 detected. On this machine use: http://localhost:".concat(port, "\n"));
                    return;
                }
                var url = "http://".concat(ip, ":").concat(port);
                console.log("\n\u001B[32m[LAN]\u001B[0m Phone (same Wi\u2011Fi) \u2014 scan or open:\n  ".concat(url, "\n"));
                qrcode.generate(url, { small: true });
                console.log('');
            });
        },
    };
}
