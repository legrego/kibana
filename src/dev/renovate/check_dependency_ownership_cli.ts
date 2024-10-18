/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { getDependenciesWithoutOwners } from './get_dependencies_without_owners';

run(
  ({ log }) => {
    const { uncoveredDevDependencies, uncoveredProdDependencies } = getDependenciesWithoutOwners();

    if (uncoveredProdDependencies.length > 0 || uncoveredDevDependencies.length > 0) {
      const prodDependenciesAsList = uncoveredProdDependencies.join('\n - ');
      const devDependenciesAsList = uncoveredDevDependencies.join('\n - ');

      const prodErrorMessage = `The following production dependencies are not covered by renovate.json rules:\n - ${prodDependenciesAsList}`;
      const devErrorMessage = `The following development dependencies are not covered by renovate.json rules:\n - ${devDependenciesAsList}`;
      throw createFailError(
        `${prodErrorMessage}\n\n${devErrorMessage}\n\nPlease add rules to renovate.json to cover these dependencies.`
      );
    }

    log.success('All dependencies are covered by renovate.json rules');
  },
  {
    usage: 'node scripts/check_dependency_ownership',
    description: 'Check if all dependencies are covered by renovate.json rules',
  }
);
