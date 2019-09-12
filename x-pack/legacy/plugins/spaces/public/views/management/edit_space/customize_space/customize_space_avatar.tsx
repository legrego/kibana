/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, Component } from 'react';
import {
  EuiColorPicker,
  EuiFieldText,
  EuiFlexItem,
  EuiFormRow,
  EuiFilePicker,
  EuiButton,
  isValidHex,
} from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';

import { encode, imageTypes } from '../../../../../common/lib/dataurl';

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
  imageUrl?: string | null;
}

class CustomizeSpaceAvatarUI extends Component<Props, State> {
  private initialsRef: HTMLInputElement | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      initialsHasFocus: false,
      imageUrl: props.space.imageUrl,
    };
  }

  private storeImageChanges(imageUrl: string) {
    this.setState({ imageUrl });
    this.props.onChange({
      ...this.props.space,
      imageUrl,
    });
  }

  //
  // images below 64x64 pixels are left untouched
  // images above that threshold are resized
  //

  private handleImageUpload = (imgUrl: string) => {
    const thisInstance = this;
    const image = new Image();
    image.addEventListener(
      'load',
      function() {
        const MAX_IMAGE_SIZE = 64;
        const imgDimx = image.width;
        const imgDimy = image.height;
        if (imgDimx <= MAX_IMAGE_SIZE && imgDimy <= MAX_IMAGE_SIZE) {
          thisInstance.storeImageChanges(imgUrl);
        } else {
          const oc = document.createElement('canvas');
          const octx = oc.getContext('2d');
          if (imgDimx >= imgDimy) {
            oc.width = MAX_IMAGE_SIZE;
            oc.height = Math.floor((imgDimy * MAX_IMAGE_SIZE) / imgDimx);
            if (octx) {
              octx.drawImage(image, 0, 0, oc.width, oc.height);
              const resizedImageUrl = oc.toDataURL();
              thisInstance.storeImageChanges(resizedImageUrl);
            }
          } else {
            oc.height = MAX_IMAGE_SIZE;
            oc.width = Math.floor((imgDimx * MAX_IMAGE_SIZE) / imgDimy);
            if (octx) {
              octx.drawImage(image, 0, 0, oc.width, oc.height);
              const resizedImageUrl = oc.toDataURL();
              thisInstance.storeImageChanges(resizedImageUrl);
            }
          }
        }
      },
      false
    );
    image.src = imgUrl;
  };

  private onFileUpload = (files: File[]) => {
    const [file] = files;
    if (imageTypes.indexOf(file.type) > -1) {
      encode(file).then((dataurl: string) => this.handleImageUpload(dataurl));
    }
  };

  public render() {
    const { space, intl } = this.props;

    const { initialsHasFocus, pendingInitials } = this.state;

    const spaceColor = getSpaceColor(space);
    const isInvalidSpaceColor = !isValidHex(spaceColor) && spaceColor !== '';

    return (
      <form onSubmit={() => false}>
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
              disabled={this.state.imageUrl && this.state.imageUrl !== '' ? true : false}
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
          {this.filePickerOrImage()}
        </EuiFlexItem>
      </form>
    );
  }

  private removeImageUrl() {
    this.setState({ imageUrl: '' });
    this.props.onChange({
      ...this.props.space,
      imageUrl: '',
    });
  }

  public filePickerOrImage() {
    const { intl } = this.props;

    if (!this.state.imageUrl) {
      return (
        <EuiFormRow
          label={intl.formatMessage({
            id: 'xpack.spaces.management.customizeSpaceAvatar.imageUrl',
            defaultMessage: 'Custom image',
          })}
        >
          <EuiFilePicker
            display="default"
            initialPromptText={intl.formatMessage({
              id: 'xpack.spaces.management.customizeSpaceAvatar.selectImageUrl',
              defaultMessage: 'Select image file',
            })}
            onChange={this.onFileUpload}
            accept={imageTypes}
          />
        </EuiFormRow>
      );
    } else {
      return (
        <EuiFlexItem grow={true}>
          <EuiButton onClick={() => this.removeImageUrl()} color="danger" iconType="trash">
            {intl.formatMessage({
              id: 'xpack.spaces.management.customizeSpaceAvatar.removeImage',
              defaultMessage: 'Remove custom image',
            })}
          </EuiButton>
        </EuiFlexItem>
      );
    }
  }

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
}

export const CustomizeSpaceAvatar = injectI18n(CustomizeSpaceAvatarUI);
