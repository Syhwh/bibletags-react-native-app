const MetroConfig = require('@ui-kitten/metro-config')
const defaultAssetExts = require("metro-config/src/defaults/defaults").assetExts

const evaConfig = {
  evaPackage: '@eva-design/eva',
  // Optional, but may be useful when using mapping customization feature.
  customMappingPath: './custom-mapping.json',
}

module.exports = MetroConfig.create(evaConfig, {
  resolver: {
    assetExts: [
      ...defaultAssetExts,
      // sqlite format
      "db",
    ],
  },
})