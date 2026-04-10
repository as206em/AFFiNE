import { cssVarV2 } from '@toeverything/theme/v2';
import clsx from 'clsx';
import { type ChangeEvent, type HTMLAttributes, useCallback, useState } from 'react';

import { Button } from '../button';
import { RadioGroup, type RadioItem } from '../radio';
import * as styles from './icon-picker.css';
import { AffineIconPicker } from './picker/affine-icon/affine-icon-picker';
import { EmojiPicker } from './picker/emoji/emoji-picker';
import { type IconData, IconType } from './type';

const panels: Array<RadioItem> = [
  { value: 'Emoji', className: styles.headerNavItem },
  { value: 'Icons', className: styles.headerNavItem },
  { value: 'Upload', className: styles.headerNavItem },
];

const uploadAccept = 'image/png,image/jpeg,image/svg+xml';

const toResizedIconBlob = async (file: File): Promise<Blob | null> => {
  if (file.type === 'image/svg+xml') {
    return file;
  }
  if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
    return null;
  }
  const src = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('failed to load image'));
      img.src = src;
    });
    const maxSize = 200;
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    context.drawImage(image, 0, 0, width, height);
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    return await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, type, type === 'image/jpeg' ? 0.85 : undefined);
    });
  } finally {
    URL.revokeObjectURL(src);
  }
};

export const IconPicker = ({
  className,
  style,
  onSelect,
}: Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> & {
  onSelect?: (data?: IconData) => void;
}) => {
  const [activePanel, setActivePanel] = useState<string>('Emoji');
  const onUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) {
        return;
      }
      const resized = await toResizedIconBlob(file);
      if (!resized) {
        return;
      }
      onSelect?.({ type: IconType.Blob, blob: resized });
    },
    [onSelect]
  );

  return (
    <div className={clsx(styles.container, className)} style={{ ...style }}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          {/* Nav */}
          <RadioGroup
            items={panels}
            value={activePanel}
            onChange={setActivePanel}
            gap={12}
            padding={0}
            borderRadius={4}
            className={styles.headerNav}
            indicatorStyle={{
              backgroundColor: cssVarV2.button.primary,
              height: 2,
              bottom: -6,
              top: 'unset',
            }}
          />

          {/* Remove */}
          <Button
            variant="plain"
            style={{ color: cssVarV2.text.secondary, fontWeight: 500 }}
            onClick={() => onSelect?.()}
          >
            Remove
          </Button>
        </div>
      </header>
      <main className={styles.main}>
        {activePanel === 'Emoji' ? (
          <EmojiPicker
            onSelect={emoji => {
              onSelect?.({ type: IconType.Emoji, unicode: emoji });
            }}
          />
        ) : activePanel === 'Icons' ? (
          <AffineIconPicker
            onSelect={(icon, color) => {
              onSelect?.({ type: IconType.AffineIcon, name: icon, color });
            }}
          />
        ) : activePanel === 'Upload' ? (
          <div className={styles.uploadPanel}>
            <label className={styles.uploadButton}>
              <input
                className={styles.uploadInput}
                type="file"
                accept={uploadAccept}
                onChange={onUpload}
              />
              Upload image
            </label>
            <div className={styles.uploadHint}>
              PNG, JPEG, SVG. PNG/JPEG auto resized to 200px max.
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};
