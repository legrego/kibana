/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { readFileSync } from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';

interface RenovatePackageRule {
  matchPackageNames?: string[];
  matchDepNames?: string[];
  matchPackagePatterns?: string[];
  matchDepPatterns?: string[];
  excludePackageNames?: string[];
  excludePackagePatterns?: string[];
  enabled?: boolean;
  reviewers?: string[];
}

// Filter packages that do not require ownership.
function packageFilter(pkg: string) {
  return (
    // @kbn-* packages are internal to this repo, and do not require ownership via renovate
    !pkg.startsWith('@kbn/') &&
    // The EUI team owns the EUI package, and it is not covered by renovate
    pkg !== '@elastic/eui'
  );
}

// Filter rules that do not represent active team ownership.
function ruleFilter(rule: RenovatePackageRule) {
  return (
    // Only include rules that are enabled
    rule.enabled !== false &&
    // Only include rules that have a team reviewer
    rule.reviewers?.some((reviewer) => reviewer.startsWith('team:'))
  );
}

export function getDependenciesWithOwners() {
  const renovateFile = resolve(REPO_ROOT, 'renovate.json');
  const packageFile = resolve(REPO_ROOT, 'package.json');

  const renovateConfig = JSON.parse(readFileSync(renovateFile, 'utf8'));
  const packageConfig = JSON.parse(readFileSync(packageFile, 'utf8'));

  const renovateRules = (renovateConfig?.packageRules || []).filter(ruleFilter);
  const packageDependencies = Object.keys(packageConfig?.dependencies || {}).filter(packageFilter);
  const packageDevDependencies = Object.keys(packageConfig?.devDependencies || {}).filter(
    packageFilter
  );

  const coveredProdDependencies = packageDependencies.filter((dependency) => {
    return renovateRules.some((rule: any) => ruleCoversDependency(rule, dependency));
  });

  const coveredDevDependencies = packageDevDependencies.filter((dependency) => {
    return renovateRules.some((rule: any) => ruleCoversDependency(rule, dependency));
  });

  return {
    coveredProdDependencies,
    coveredDevDependencies,
  };
}

export function getDependenciesWithoutOwners() {
  const renovateFile = resolve(REPO_ROOT, 'renovate.json');
  const packageFile = resolve(REPO_ROOT, 'package.json');

  const renovateConfig = JSON.parse(readFileSync(renovateFile, 'utf8'));
  const packageConfig = JSON.parse(readFileSync(packageFile, 'utf8'));

  const renovateRules = (renovateConfig?.packageRules || []).filter(ruleFilter);
  const packageDependencies = Object.keys(packageConfig?.dependencies || {}).filter(packageFilter);
  const packageDevDependencies = Object.keys(packageConfig?.devDependencies || {}).filter(
    packageFilter
  );

  const uncoveredProdDependencies = packageDependencies.filter((dependency) => {
    return !renovateRules.some((rule: any) => ruleCoversDependency(rule, dependency));
  });

  const uncoveredDevDependencies = packageDevDependencies.filter((dependency) => {
    return !renovateRules.some((rule: any) => ruleCoversDependency(rule, dependency));
  });

  return {
    uncoveredProdDependencies,
    uncoveredDevDependencies,
  };
}

function ruleCoversDependency(rule: RenovatePackageRule, dependency: string) {
  const {
    matchPackageNames = [],
    matchPackagePatterns = [],
    matchDepNames = [],
    matchDepPatterns = [],
    excludePackageNames = [],
    excludePackagePatterns = [],
  } = rule;

  const packageIncluded =
    matchPackageNames.includes(dependency) ||
    matchDepNames.includes(dependency) ||
    matchPackagePatterns.some((pattern) => new RegExp(pattern).test(dependency)) ||
    matchDepPatterns.some((pattern) => new RegExp(pattern).test(dependency));

  const packageExcluded =
    excludePackageNames.includes(dependency) ||
    excludePackagePatterns.some((pattern) => new RegExp(pattern).test(dependency));

  return packageIncluded && !packageExcluded;
}
