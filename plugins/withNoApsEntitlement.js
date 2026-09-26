/**
 * Strips the iOS `aps-environment` entitlement that expo-notifications'
 * config plugin injects unconditionally.
 *
 * Why it exists: bill reminders are LOCAL-only (ADR 0017 d1; no-network
 * rule), and local notifications need no APS entitlement. The plugin cannot
 * simply be left out of app.json: expo prebuild AUTO-APPLIES the config
 * plugin of every installed Expo package (autolinked plugins), which is what
 * failed internal builds 26 and 27 against a provisioning profile that,
 * rightly, carries no Push Notifications capability.
 *
 * Entitlement mods run in registration order and autolinked plugins register
 * before app.json's, so this delete runs last and wins. If remote push is
 * ever wanted, delete this plugin as part of that strategy change (it has a
 * privacy-label consequence; see the reminders spec, section 6).
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withNoApsEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
