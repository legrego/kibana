/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import {
  EuiIcon,
} from '@elastic/eui';
import { PanelOptionsMenuForm } from '../panel_options_menu_form';
import { DashboardPanelAction, DashboardContextMenuPanel } from 'ui/dashboard_panel_actions';
import { DashboardViewMode } from '../../../dashboard_view_mode';

/**
 *
 * @param {function} onResetPanelTitle
 * @param {function} onUpdatePanelTitle
 * @param {string} title
 * @param {function} closeContextMenu
 * @return {DashboardPanelAction}
 */
export function getCustomizePanelAction({ onResetPanelTitle, onUpdatePanelTitle, title, closeContextMenu }) {
  return new DashboardPanelAction(
    {
      id: 'customizePanel',
      displayName: 'Customize panel',
      parentPanelId: 'mainMenu',
    },
    {
      icon: <EuiIcon type="pencil" />,
      isVisible: ({ containerState }) => (containerState.viewMode === DashboardViewMode.EDIT),
      childContextMenuPanel: new DashboardContextMenuPanel(
        {
          id: 'panelSubOptionsMenu',
          title: 'Customize panel',
        },
        {
          getContent: () => (<PanelOptionsMenuForm
            onReset={onResetPanelTitle}
            onUpdatePanelTitle={onUpdatePanelTitle}
            title={title}
            onClose={closeContextMenu}
          />),
        }),
    });
}
