/**
 * Isolated Notifee loader — this file's sole purpose is to require
 * @notifee/react-native. If it crashes (e.g. in Expo Go where the
 * native module isn't linked), the error is caught by the caller
 * in notifee.ts via a dynamic require wrapped in try/catch.
 *
 * Metro evaluates module-level code eagerly, so the try/catch in
 * the calling file catches the error thrown during evaluation of
 * THIS file, not during the require() call itself.
 */

const notifeeModule = require("@notifee/react-native");

module.exports = {
  notifee: notifeeModule.default,
  TriggerType: notifeeModule.TriggerType,
  AndroidImportance: notifeeModule.AndroidImportance,
  AndroidStyle: notifeeModule.AndroidStyle,
  AuthorizationStatus: notifeeModule.AuthorizationStatus,
  EventType: notifeeModule.EventType,
};
