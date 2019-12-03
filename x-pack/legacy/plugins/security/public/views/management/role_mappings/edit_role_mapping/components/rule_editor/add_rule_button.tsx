/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiPopover, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import { AllRule } from '../../../../../../../common/model/role_mappings/all_rule';
import { FieldRule } from '../../../../../../../common/model/role_mappings/field_rule';
import { BaseRule } from '../../../../../../../common/model/role_mappings/base_rule';

interface Props {
  onClick: (newRule: BaseRule) => void;
}

export const AddRuleButton = (props: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const button = (
    <EuiButtonEmpty
      iconType="plusInCircle"
      onClick={() => {
        setIsMenuOpen(!isMenuOpen);
      }}
    >
      Add
    </EuiButtonEmpty>
  );

  const options = [
    <EuiContextMenuItem
      key="rule"
      name="Add rule"
      icon="user"
      onClick={() => {
        setIsMenuOpen(false);
        props.onClick(new FieldRule('username', '*'));
      }}
    >
      Add Rule
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="ruleGroup"
      name="Add rule group"
      icon="partial"
      onClick={() => {
        setIsMenuOpen(false);
        props.onClick(new AllRule([]));
      }}
    >
      Add rule group
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      id="addRuleContextMenu"
      button={button}
      isOpen={isMenuOpen}
      closePopover={() => setIsMenuOpen(false)}
      panelPaddingSize="none"
      withTitle
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel title="Add rule" items={options} />
    </EuiPopover>
  );
};
