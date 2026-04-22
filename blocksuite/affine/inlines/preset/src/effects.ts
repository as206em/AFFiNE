import { AffinePageHashtag } from './nodes/affine-page-hashtag';
import { AffineText } from './nodes/affine-text';

export function effects() {
  if (!customElements.get('affine-page-hashtag')) {
    customElements.define('affine-page-hashtag', AffinePageHashtag);
  }
  if (!customElements.get('affine-text')) {
    customElements.define('affine-text', AffineText);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-page-hashtag': AffinePageHashtag;
    'affine-text': AffineText;
  }
}
