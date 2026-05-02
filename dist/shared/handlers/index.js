"use strict";
/**
 * 📦 Barrel file for handlers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHandler = exports.createEventHandler = exports.CommandHandler = exports.commandHandler = void 0;
var command_handler_1 = require("./command.handler");
Object.defineProperty(exports, "commandHandler", { enumerable: true, get: function () { return command_handler_1.commandHandler; } });
Object.defineProperty(exports, "CommandHandler", { enumerable: true, get: function () { return command_handler_1.CommandHandler; } });
var event_handler_1 = require("./event.handler");
Object.defineProperty(exports, "createEventHandler", { enumerable: true, get: function () { return event_handler_1.createEventHandler; } });
Object.defineProperty(exports, "EventHandler", { enumerable: true, get: function () { return event_handler_1.EventHandler; } });
//# sourceMappingURL=index.js.map