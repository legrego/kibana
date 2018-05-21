import { defaults } from 'lodash';

import { getUpgradeableConfig } from './get_upgradeable_config';

export async function createOrUpgradeSavedConfig(options) {
  const {
    savedObjectsClient,
    id,
    version,
    buildNum,
    log,
  } = options;

  // try to find an older config we can upgrade
  const upgradeableConfig = await getUpgradeableConfig({
    savedObjectsClient,
    version
  });

  if (upgradeableConfig) {

    let prevVersion = upgradeableConfig.version;
    // TODO(legrego): update comment with real versions
    // This check can be removed after Y.Z.
    // Prior to version X.Y, the config document's id was also used to store the version of Kibana that config was valid for.
    // From X.Y forward, the Kibana version is stored in a dedicated "version" field.
    if (!prevVersion) {
      prevVersion = upgradeableConfig.id;
    }

    log(['plugin', 'elasticsearch'], {
      tmpl: 'Upgrade config from <%= prevVersion %> to <%= newVersion %>',
      prevVersion,
      newVersion: version
    });
  }

  // default to the attributes of the upgradeableConfig if available
  const attributes = defaults(
    { buildNum, version },
    upgradeableConfig ? upgradeableConfig.attributes : {}
  );

  // create the new SavedConfig
  await savedObjectsClient.create(
    'config',
    attributes,
    { id }
  );
}
