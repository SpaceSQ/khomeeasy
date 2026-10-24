const { withXcodeProject } = require('expo/config-plugins');

/** Enables the In-App Purchase capability. Apple no longer accepts the legacy entitlement key. */
function withInAppPurchase(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const targetUuid = project.getFirstTarget().uuid;
    const attributes = project.getFirstProject().firstProject.attributes;
    attributes.TargetAttributes = attributes.TargetAttributes ?? {};
    const target = attributes.TargetAttributes[targetUuid] ?? {};
    target.SystemCapabilities = {
      ...(target.SystemCapabilities ?? {}),
      'com.apple.InAppPurchase': { enabled: 1 }
    };
    attributes.TargetAttributes[targetUuid] = target;
    return config;
  });
}

module.exports = withInAppPurchase;
