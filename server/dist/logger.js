"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LogLevel;
(function (LogLevel) {
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
class Logger {
    static log(level, message) {
        if ([LogLevel.INFO, LogLevel.WARN].includes(level)) {
            console[level](`> > > > ${Date.now()} - ${message} < < < <`);
        }
        else {
            console[level](message);
        }
    }
    static info(message) {
        Logger.log(LogLevel.INFO, message);
    }
    static warn(message) {
        Logger.log(LogLevel.WARN, message);
    }
    static error(message) {
        Logger.log(LogLevel.ERROR, message);
    }
}
exports.default = Logger;
//# sourceMappingURL=logger.js.map