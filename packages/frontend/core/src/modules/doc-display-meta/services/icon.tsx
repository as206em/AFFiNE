import { type IconData, IconRenderer, IconType } from '@affine/component';
import * as litIcons from '@blocksuite/icons/lit';
import { html } from 'lit';

const blobUrlMap = new WeakMap<Blob, string>();

const getBlobUrl = (blob: Blob) => {
  const current = blobUrlMap.get(blob);
  if (current) {
    return current;
  }
  const next = URL.createObjectURL(blob);
  blobUrlMap.set(blob, next);
  return next;
};

export const getDocIconComponent = (icon: IconData) => {
  const Icon = () => <IconRenderer data={icon} />;
  Icon.displayName = 'DocIcon';
  return Icon;
};

export const getDocIconComponentLit = (icon: IconData) => {
  return () => {
    if (icon.type === IconType.Emoji) {
      return html`<div class="icon">${icon.unicode}</div>`;
    }
    if (icon.type === IconType.AffineIcon) {
      return html`<div
        style="color: ${icon.color}; display: flex; align-items: center; justify-content: center;"
      >
        ${litIcons[`${icon.name}Icon` as keyof typeof litIcons]()}
      </div>`;
    }
    if (icon.type === IconType.Blob) {
      return html`<img
        src=${getBlobUrl(icon.blob)}
        alt=""
        style="width: 100%; height: 100%; object-fit: contain;"
      />`;
    }
    return null;
  };
};
