import { Level } from "../generated/imports.js";
import { Types } from "../index.js";

/**
 * Global event logger
 *
 * @param {Types.EmitterScope} scope Debug statement's wrapper class
 * @param {Types.Emitter} emitter Name of calling function
 * @param {string} message Informative message
 * @param {Protobuf.LogRecord_Level} level Desired logging level
 * @param {Protobuf.LogRecord_Level} currentLevel Current logging level
 */
export const log = (
  scope: Types.EmitterScope,
  emitter: Types.Emitter,
  message: string,
  level: Level,
  currentLevel: Level
): void => {
  if (level >= currentLevel) {
    switch (level) {
      case "TRACE":
        console.info(
          `%c[TRACE]%c ${Types.EmitterScope[scope] ?? "UNK"}.${
            Types.Emitter[emitter] ?? "UNK"
          }\n%c${message}`,
          "color:grey",
          "color:darkgrey",
          "color:white"
        );
        break;

      case "DEBUG":
        console.info(
          `%c[DEBUG]%c ${Types.EmitterScope[scope] ?? "UNK"}.${
            Types.Emitter[emitter] ?? "UNK"
          }\n%c${message}`,
          "color:lightcyan",
          "color:darkgrey",
          "color:white"
        );
        break;

      case "INFO":
        console.info(
          `%c[INFO]%c ${Types.EmitterScope[scope] ?? "UNK"}.${
            Types.Emitter[emitter] ?? "UNK"
          }\n%c${message}`,
          "color:darkgrey",
          "color:cyan",
          "color:white"
        );
        break;
      case "WARNING":
        console.warn(
          `%c[WARNING]%c ${Types.EmitterScope[scope] ?? "UNK"}.${
            Types.Emitter[emitter] ?? "UNK"
          }\n%c${message}`,
          "color:yellow",
          "color:darkgrey",
          "color:white"
        );
        break;

      case "ERROR":
        console.error(
          `%c[ERROR]%c ${Types.EmitterScope[scope] ?? "UNK"}.${
            Types.Emitter[emitter] ?? "UNK"
          }\n%c${message}`,
          "color:orangered",
          "color:darkgrey",
          "color:white"
        );
        break;

      case "CRITICAL":
        console.error(
          `%c[CRITICAL]%c ${Types.EmitterScope[scope] ?? "UNK"}.${
            Types.Emitter[emitter] ?? "UNK"
          }\n%c${message}`,
          "color:red",
          "color:darkgrey",
          "color:white"
        );
        break;
      default:
        break;
    }
  }
};
