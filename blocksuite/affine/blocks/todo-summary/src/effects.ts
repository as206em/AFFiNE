import { AffinePageHashtag } from '@blocksuite/affine-inline-preset';

import { TodoSummaryBlockComponent } from './todo-summary-block.js';

export function effects() {
  if (!customElements.get('affine-page-hashtag')) {
    customElements.define('affine-page-hashtag', AffinePageHashtag);
  }
  customElements.define('affine-todo-summary', TodoSummaryBlockComponent);
}
