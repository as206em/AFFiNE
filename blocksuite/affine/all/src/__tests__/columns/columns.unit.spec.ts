import { insertColumnsBlockCommand } from '@blocksuite/affine-block-note';
import {
  CalloutBlockSchemaExtension,
  CodeBlockSchemaExtension,
  ColumnBlockSchemaExtension,
  ColumnsBlockSchemaExtension,
  ListBlockSchemaExtension,
  NoteBlockSchemaExtension,
  ParagraphBlockSchemaExtension,
  RootBlockSchemaExtension,
  TableBlockSchemaExtension,
} from '@blocksuite/affine-model';
import { getNextContentBlock } from '@blocksuite/affine-shared/utils';
import { Text } from '@blocksuite/store';
import {
  createAutoIncrementIdGenerator,
  TestWorkspace,
} from '@blocksuite/store/test';
import { describe, expect, test } from 'vitest';

import { effects } from '../../../../blocks/note/src/effects';
import { normalizeEmptyColumn } from '../../../../blocks/note/src/utils/normalize-columns';
import { mergeWithPrev } from '../../../../blocks/paragraph/src/utils/merge-with-prev';
import { createTestHost } from '../../../../shared/src/test-utils/create-test-host';
import { getColumnDropTarget } from '../../../../widgets/drag-handle/src/utils';

function createDoc() {
  const collection = new TestWorkspace({
    id: 'test-workspace',
    idGenerator: createAutoIncrementIdGenerator(),
  });
  collection.meta.initialize();
  const doc = collection.createDoc('doc0');
  doc.load();
  return doc.getStore({
    extensions: [
      RootBlockSchemaExtension,
      NoteBlockSchemaExtension,
      ParagraphBlockSchemaExtension,
      ListBlockSchemaExtension,
      CalloutBlockSchemaExtension,
      CodeBlockSchemaExtension,
      TableBlockSchemaExtension,
      ColumnsBlockSchemaExtension,
      ColumnBlockSchemaExtension,
    ],
  });
}

describe('columns block', () => {
  test('registers column custom elements', () => {
    effects();

    expect(customElements.get('affine-columns')).toBeTruthy();
    expect(customElements.get('affine-column')).toBeTruthy();
  });

  test('allows note -> columns -> column -> paragraph structure', () => {
    const doc = createDoc();
    const pageId = doc.addBlock('affine:page', { title: new Text('test') });
    const noteId = doc.addBlock('affine:note', {}, pageId);
    const columnsId = doc.addBlock('affine:columns', {}, noteId);
    const leftId = doc.addBlock('affine:column', { width: 1 }, columnsId);
    const rightId = doc.addBlock('affine:column', { width: 1 }, columnsId);
    const leftParagraphId = doc.addBlock(
      'affine:paragraph',
      { text: new Text('left') },
      leftId
    );
    const rightParagraphId = doc.addBlock(
      'affine:paragraph',
      { text: new Text('right') },
      rightId
    );

    const columns = doc.getModelById(columnsId);
    const leftParagraph = doc.getModelById(leftParagraphId);
    const rightParagraph = doc.getModelById(rightParagraphId);

    expect(columns?.children.map(child => child.flavour)).toEqual([
      'affine:column',
      'affine:column',
    ]);
    expect(leftParagraph?.parent?.id).toBe(leftId);
    expect(rightParagraph?.parent?.id).toBe(rightId);
  });

  test('navigates to the next column content in document order', () => {
    const doc = createDoc();
    const pageId = doc.addBlock('affine:page', { title: new Text('test') });
    const noteId = doc.addBlock('affine:note', {}, pageId);
    const columnsId = doc.addBlock('affine:columns', {}, noteId);
    const leftId = doc.addBlock('affine:column', { width: 1 }, columnsId);
    const rightId = doc.addBlock('affine:column', { width: 1 }, columnsId);
    const leftParagraphId = doc.addBlock(
      'affine:paragraph',
      { text: new Text('left') },
      leftId
    );
    const rightParagraphId = doc.addBlock(
      'affine:paragraph',
      { text: new Text('right') },
      rightId
    );

    const leftParagraph = doc.getModelById(leftParagraphId);
    const editorHost = {
      std: {
        get: () => ({
          getEditorMode: () => 'page',
        }),
      },
    } as never;

    expect(getNextContentBlock(editorHost, leftParagraph!)?.id).toBe(
      rightParagraphId
    );
  });

  test('allows common note blocks inside a column', () => {
    const doc = createDoc();

    expect(doc.schema.safeValidate('affine:paragraph', 'affine:column')).toBe(
      true
    );
    expect(doc.schema.safeValidate('affine:list', 'affine:column')).toBe(true);
    expect(doc.schema.safeValidate('affine:callout', 'affine:column')).toBe(
      true
    );
    expect(doc.schema.safeValidate('affine:code', 'affine:column')).toBe(true);
    expect(doc.schema.safeValidate('affine:table', 'affine:column')).toBe(true);
  });

  test('insertColumnsBlockCommand adds sibling columns with seeded paragraphs', () => {
    const doc = createDoc();
    const pageId = doc.addBlock('affine:page', { title: new Text('test') });
    const noteId = doc.addBlock('affine:note', {}, pageId);
    const paragraphId = doc.addBlock('affine:paragraph', {}, noteId);
    const paragraph = doc.getModelById(paragraphId);
    let insertedColumnsBlockId: string | undefined;

    insertColumnsBlockCommand(
      {
        std: {
          store: doc,
        } as never,
        selectedModels: paragraph ? [paragraph] : [],
        columnCount: 2,
        place: 'after',
        removeEmptyLine: true,
      },
      next => {
        insertedColumnsBlockId = next?.insertedColumnsBlockId;
      }
    );

    const note = doc.getModelById(noteId);
    const columns = insertedColumnsBlockId
      ? doc.getModelById(insertedColumnsBlockId)
      : null;

    expect(note?.children.map(child => child.flavour)).toEqual([
      'affine:columns',
    ]);
    expect(columns?.children).toHaveLength(2);
    expect(
      columns?.children.every(column => column.flavour === 'affine:column')
    ).toBe(true);
    expect(
      columns?.children.every(column => column.children.length === 1)
    ).toBe(true);
    expect(
      columns?.children.every(
        column => column.children[0]?.flavour === 'affine:paragraph'
      )
    ).toBe(true);
  });

  test('flattens 2 columns back into note when one column becomes empty', () => {
    const doc = createDoc();
    const pageId = doc.addBlock('affine:page', { title: new Text('test') });
    const noteId = doc.addBlock('affine:note', {}, pageId);
    const beforeId = doc.addBlock(
      'affine:paragraph',
      { text: new Text('before') },
      noteId
    );
    const columnsId = doc.addBlock('affine:columns', {}, noteId);
    const leftId = doc.addBlock('affine:column', { width: 1 }, columnsId);
    const rightId = doc.addBlock('affine:column', { width: 1 }, columnsId);
    const leftParagraphId = doc.addBlock(
      'affine:paragraph',
      { text: new Text('left') },
      leftId
    );
    const rightParagraphId = doc.addBlock(
      'affine:paragraph',
      { text: new Text('right') },
      rightId
    );
    const afterId = doc.addBlock(
      'affine:paragraph',
      { text: new Text('after') },
      noteId
    );

    doc.deleteBlock(leftParagraphId);
    normalizeEmptyColumn(doc.getModelById(leftId)!);

    const note = doc.getModelById(noteId);
    expect(note?.children.map(child => child.flavour)).toEqual([
      'affine:paragraph',
      'affine:paragraph',
      'affine:paragraph',
    ]);
    expect(note?.children.map(child => child.id)).toEqual([
      beforeId,
      rightParagraphId,
      afterId,
    ]);
    expect(doc.getModelById(columnsId)).toBeNull();
  });

  test('reduces 3 columns to 2 when one column becomes empty', () => {
    const doc = createDoc();
    const pageId = doc.addBlock('affine:page', { title: new Text('test') });
    const noteId = doc.addBlock('affine:note', {}, pageId);
    const columnsId = doc.addBlock('affine:columns', {}, noteId);
    const leftId = doc.addBlock('affine:column', { width: 1 }, columnsId);
    const middleId = doc.addBlock('affine:column', { width: 1 }, columnsId);
    const rightId = doc.addBlock('affine:column', { width: 1 }, columnsId);
    const middleParagraphId = doc.addBlock(
      'affine:paragraph',
      { text: new Text('middle') },
      middleId
    );

    doc.addBlock('affine:paragraph', { text: new Text('left') }, leftId);
    doc.addBlock('affine:paragraph', { text: new Text('right') }, rightId);

    doc.deleteBlock(middleParagraphId);
    normalizeEmptyColumn(doc.getModelById(middleId)!);

    const note = doc.getModelById(noteId);
    const columns = doc.getModelById(columnsId);

    expect(note?.children.map(child => child.id)).toEqual([columnsId]);
    expect(columns?.children.map(child => child.id)).toEqual([leftId, rightId]);
    expect(doc.getModelById(middleId)).toBeNull();
  });

  test('mergeWithPrev normalizes 2 columns when deleting the only block in a column', () => {
    const doc = createDoc();
    const pageId = doc.addBlock('affine:page', { title: new Text('test') });
    const noteId = doc.addBlock('affine:note', {}, pageId);
    const columnsId = doc.addBlock('affine:columns', {}, noteId);
    const leftId = doc.addBlock('affine:column', { width: 1 }, columnsId);
    const rightId = doc.addBlock('affine:column', { width: 1 }, columnsId);
    const leftParagraphId = doc.addBlock(
      'affine:paragraph',
      { text: new Text('left') },
      leftId
    );
    const rightParagraphId = doc.addBlock(
      'affine:paragraph',
      { text: new Text('right') },
      rightId
    );

    const host = createTestHost(doc);
    host.updateComplete = Promise.resolve() as never;
    host.std.store = doc;
    host.std.event = { active: false } as never;
    host.std.range = {
      syncTextSelectionToRange: () => {},
    } as never;
    host.std.get = () => ({
      getEditorMode: () => 'page',
    });

    const rightParagraph = doc.getModelById(rightParagraphId);
    const merged = mergeWithPrev(host, rightParagraph!);
    const note = doc.getModelById(noteId);

    expect(merged).toBe(true);
    expect(note?.children.map(child => child.id)).toEqual([leftParagraphId]);
    expect(doc.getModelById(columnsId)).toBeNull();
  });

  test('column drop target uses the last child at the bottom edge', () => {
    const doc = createDoc();
    const pageId = doc.addBlock('affine:page', { title: new Text('test') });
    const noteId = doc.addBlock('affine:note', {}, pageId);
    const columnsId = doc.addBlock('affine:columns', {}, noteId);
    const columnId = doc.addBlock('affine:column', { width: 1 }, columnsId);
    const firstId = doc.addBlock(
      'affine:paragraph',
      { text: new Text('first') },
      columnId
    );
    const secondId = doc.addBlock(
      'affine:paragraph',
      { text: new Text('second') },
      columnId
    );

    const target = getColumnDropTarget(
      {
        model: doc.getModelById(columnId),
        childBlocks: [
          { model: doc.getModelById(firstId) },
          { model: doc.getModelById(secondId) },
        ],
      } as never,
      'bottom'
    );

    expect(target?.placement).toBe('after');
    expect(target?.model.id).toBe(secondId);
  });
});
