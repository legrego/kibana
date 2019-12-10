/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AllRule,
  AnyRule,
  FieldRule,
  ExceptAllRule,
  ExceptAnyRule,
  ExceptFieldRule,
  RuleGroup,
} from '.';

describe('Except Any rule', () => {
  it('can be constructed without sub rules', () => {
    const rule = new ExceptAnyRule();
    expect(rule.getRules()).toHaveLength(0);
  });

  it('can be constructed with sub rules', () => {
    const rule = new ExceptAnyRule([new AllRule()]);
    expect(rule.getRules()).toHaveLength(1);
  });

  it('can accept non-except rules', () => {
    const subRules = [new AllRule(), new AnyRule(), new FieldRule('username', '*')];

    const rule = new ExceptAnyRule() as RuleGroup;
    expect(rule.canAddRule()).toEqual(true);
    expect(rule.canContainRules(subRules)).toEqual(true);
    subRules.forEach(sr => rule.addRule(sr));
    expect(rule.getRules()).toEqual([...subRules]);
  });

  it('cannot accept except rules', () => {
    const subRules = [new ExceptAllRule(), new ExceptAnyRule(), new ExceptFieldRule()];

    const rule = new ExceptAnyRule() as RuleGroup;
    expect(rule.canAddRule()).toEqual(true);
    expect(rule.canContainRules(subRules)).toEqual(false);
  });

  it('can replace an existing rule', () => {
    const rule = new ExceptAnyRule([new AllRule()]);
    const newRule = new FieldRule('username', '*');
    rule.replaceRule(0, newRule);
    expect(rule.getRules()).toEqual([newRule]);
  });

  it('can remove an existing rule', () => {
    const rule = new ExceptAnyRule([new AllRule()]);
    rule.removeRule(0);
    expect(rule.getRules()).toHaveLength(0);
  });

  it('can covert itself into a raw representation', () => {
    const rule = new ExceptAnyRule([new AllRule()]);
    expect(rule.toRaw()).toEqual({
      except: { any: [{ all: [] }] },
    });
  });
});
