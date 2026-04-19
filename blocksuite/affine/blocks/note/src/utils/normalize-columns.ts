import type { ColumnBlockModel } from '@blocksuite/affine-model';

export function normalizeEmptyColumn(column: ColumnBlockModel | null) {
  if (!column || column.children.length !== 0) {
    return false;
  }

  const columns = column.parent;
  if (!columns || columns.flavour !== 'affine:columns') {
    return false;
  }

  const note = columns.parent;
  if (!note || note.flavour !== 'affine:note') {
    return false;
  }

  const store = column.store;

  if (columns.children.length === 2) {
    columns.children.forEach(child => {
      if (child.id === column.id || child.children.length === 0) {
        return;
      }
      store.moveBlocks([...child.children], note, columns);
    });
    store.deleteBlock(columns);
    if (note.children.length === 0) {
      store.addBlock('affine:paragraph', {}, note.id);
    }
    return true;
  }

  if (columns.children.length === 3) {
    store.deleteBlock(column);
    return true;
  }

  return false;
}
