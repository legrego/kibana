/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiColorPicker,
  EuiFieldText,
  EuiFlexItem,
  EuiFormRow,
  isValidHex,
  EuiComboBox,
  // @ts-ignore
  EuiFilePicker,
  EuiComboBoxOptionProps,
  EuiHorizontalRule,
  EuiText,
  // @ts-ignore
  EuiImage,
  EuiButtonEmpty,
} from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { ChangeEvent, Component, Fragment } from 'react';
import { imageTypes, encode } from '../../../../lib/dataurl';
import { MAX_SPACE_INITIALS } from '../../../../../common/constants';
import { Space } from '../../../../../common/model/space';
import { getSpaceColor, getSpaceInitials } from '../../../../../common/space_attributes';

interface Props {
  space: Partial<Space>;
  onChange: (space: Partial<Space>) => void;
  intl: InjectedIntl;
}

interface State {
  initialsHasFocus: boolean;
  pendingInitials?: string | null;
  displayType: 'initials' | 'image';
}

class CustomizeSpaceAvatarUI extends Component<Props, State> {
  private initialsRef: HTMLInputElement | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      initialsHasFocus: false,
      displayType: props.space.imageUrl ? 'image' : 'initials',
    };
  }

  public render() {
    const { intl } = this.props;

    const { displayType } = this.state;

    const displayTypeOptions = [
      { id: 'initials', label: 'Color & Initials' },
      { id: 'image', label: 'Image' },
    ];

    const selectedOption = displayTypeOptions.filter(option => option.id === displayType);

    return (
      <form onSubmit={() => false}>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={intl.formatMessage({
              id: 'xpack.spaces.management.customizeSpaceAvatar.displayTypeFormRowLabel',
              defaultMessage: 'Display type',
            })}
          >
            <EuiComboBox
              options={displayTypeOptions}
              singleSelection={{ asPlainText: true }}
              selectedOptions={selectedOption}
              onChange={this.onDisplayTypeChange}
              isClearable={false}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiHorizontalRule />
        {this.getCustomizeOptions()}
      </form>
    );
  }

  public onDisplayTypeChange = (selectedOptions: EuiComboBoxOptionProps[]) => {
    this.setState({
      displayType: (selectedOptions[0].id as State['displayType']) || 'initials',
    });
  };

  public getCustomizeOptions = () => {
    const { intl, space } = this.props;
    const { initialsHasFocus, pendingInitials, displayType } = this.state;
    const spaceColor = getSpaceColor(space);
    const isInvalidSpaceColor = !isValidHex(spaceColor) && spaceColor !== '';

    switch (displayType) {
      case 'initials':
        return (
          <Fragment>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={intl.formatMessage({
                  id: 'xpack.spaces.management.customizeSpaceAvatar.initialItemsFormRowLabel',
                  defaultMessage: 'Initials (2 max)',
                })}
              >
                <EuiFieldText
                  inputRef={this.initialsInputRef}
                  name="spaceInitials"
                  // allows input to be cleared or otherwise invalidated while user is editing the initials,
                  // without defaulting to the derived initials provided by `getSpaceInitials`
                  value={initialsHasFocus ? pendingInitials || '' : getSpaceInitials(space)}
                  onChange={this.onInitialsChange}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiFormRow
                label={intl.formatMessage({
                  id: 'xpack.spaces.management.customizeSpaceAvatar.colorFormRowLabel',
                  defaultMessage: 'Color',
                })}
                isInvalid={isInvalidSpaceColor}
              >
                <EuiColorPicker
                  color={spaceColor}
                  onChange={this.onColorChange}
                  isInvalid={isInvalidSpaceColor}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </Fragment>
        );
      case 'image':
        return (
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label={intl.formatMessage({
                id: 'xpack.spaces.management.customizeSpaceAvatar.imageFormRowLabel',
                defaultMessage: 'Image',
              })}
            >
              <Fragment>
                <EuiText>
                  <p>
                    {intl.formatMessage({
                      id: 'xpack.spaces.management.customizeSpaceAvatar.imageGuidelines',
                      defaultMessage:
                        'For best results, choose a square image between 50x50 and 100x100',
                    })}
                  </p>
                </EuiText>
                {space.imageUrl && (
                  <Fragment>
                    <EuiImage
                      size="m"
                      alt={intl.formatMessage({
                        id: 'xpack.spaces.management.customizeSpaceAvatar.imagePreviewAltText',
                        defaultMessage: 'A preview of the selected image',
                      })}
                      url={space.imageUrl}
                    />
                    <EuiButtonEmpty onClick={this.clearImage}>
                      {intl.formatMessage({
                        id: 'xpack.spaces.management.customizeSpaceAvatar.removeImageButton',
                        defaultMessage: 'Remove image',
                      })}
                    </EuiButtonEmpty>
                  </Fragment>
                )}
                {!space.imageUrl && (
                  <EuiFilePicker
                    name="space-image"
                    onChange={this.onSpaceImageChange}
                    accept={imageTypes}
                  />
                )}
              </Fragment>
            </EuiFormRow>
          </EuiFlexItem>
        );
      default:
        throw new Error(`Unsupported displayType: ${displayType}`);
    }
  };

  public initialsInputRef = (ref: HTMLInputElement) => {
    if (ref) {
      this.initialsRef = ref;
      this.initialsRef.addEventListener('focus', this.onInitialsFocus);
      this.initialsRef.addEventListener('blur', this.onInitialsBlur);
    } else {
      if (this.initialsRef) {
        this.initialsRef.removeEventListener('focus', this.onInitialsFocus);
        this.initialsRef.removeEventListener('blur', this.onInitialsBlur);
        this.initialsRef = null;
      }
    }
  };

  public onInitialsFocus = () => {
    this.setState({
      initialsHasFocus: true,
      pendingInitials: getSpaceInitials(this.props.space),
    });
  };

  public onInitialsBlur = () => {
    this.setState({
      initialsHasFocus: false,
      pendingInitials: null,
    });
  };

  public onInitialsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const initials = (e.target.value || '').substring(0, MAX_SPACE_INITIALS);

    this.setState({
      pendingInitials: initials,
    });

    this.props.onChange({
      ...this.props.space,
      initials,
    });
  };

  public onColorChange = (color: string) => {
    this.props.onChange({
      ...this.props.space,
      color,
    });
  };

  public clearImage = () => {
    const space = { ...this.props.space };
    delete space.imageUrl;
    this.props.onChange(space);
  };

  public onSpaceImageChange = async (files: FileList) => {
    if (files.length > 0) {
      const file = files[0];
      if (!imageTypes.includes(file.type)) {
        console.error('TODO: invalid file format');
      } else if (file.size > 50000) {
        console.error('TODO: file greater than 50kb');
      } else {
        const imageUrl = await encode(file, file.type);
        console.log(file, imageUrl);
        this.props.onChange({
          ...this.props.space,
          imageUrl,
        });
      }
    } else {
      this.clearImage();
    }
  };
}

export const CustomizeSpaceAvatar = injectI18n(CustomizeSpaceAvatarUI);
