/**
 * TabContext.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2017 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

import { Arr, Option } from '@ephox/katamari';
import { CellNavigation, TableLookup } from '@ephox/snooker';
import {
    Compare, CursorPosition, Element, Node, Selection, SelectorFilter, SelectorFind, WindowSelection
} from '@ephox/sugar';

import VK from 'tinymce/core/api/util/VK';

import Util from '../alien/Util';
import TableTargets from './TableTargets';
import { Editor } from 'tinymce/core/api/Editor';
import { TableActions } from 'tinymce/plugins/table/actions/TableActions';

const forward = function (editor: Editor, isRoot, cell, lazyWire) {
  return go(editor, isRoot, CellNavigation.next(cell), lazyWire);
};

const backward = function (editor: Editor, isRoot, cell, lazyWire) {
  return go(editor, isRoot, CellNavigation.prev(cell), lazyWire);
};

const getCellFirstCursorPosition = function (editor: Editor, cell) {
  const selection = Selection.exact(cell, 0, cell, 0);
  return WindowSelection.toNative(selection);
};

const getNewRowCursorPosition = function (editor: Editor, table) {
  const rows = SelectorFilter.descendants(table, 'tr');
  return Arr.last(rows).bind(function (last) {
    return SelectorFind.descendant(last, 'td,th').map(function (first) {
      return getCellFirstCursorPosition(editor, first);
    });
  });
};

const go: any = function (editor: Editor, isRoot, cell, actions, lazyWire) { // TODO: forwars/backward is calling without actions
  return cell.fold(Option.none, Option.none, function (current, next) {
    return CursorPosition.first(next).map(function (cell) {
      return getCellFirstCursorPosition(editor, cell);
    });
  }, function (current) {
    return TableLookup.table(current, isRoot).bind(function (table) {
      const targets = TableTargets.noMenu(current);
      editor.undoManager.transact(function () {
        actions.insertRowsAfter(table, targets);
      });
      return getNewRowCursorPosition(editor, table);
    });
  });
};

const rootElements = ['table', 'li', 'dl'];

const handle = function (event: KeyboardEvent, editor: Editor, actions: TableActions, lazyWire) {
  if (event.keyCode === VK.TAB) {
    const body = Util.getBody(editor);
    const isRoot = function (element) {
      const name = Node.name(element);
      return Compare.eq(element, body) || Arr.contains(rootElements, name);
    };

    const rng = editor.selection.getRng();
    if (rng.collapsed) {
      const start = Element.fromDom(rng.startContainer);
      TableLookup.cell(start, isRoot).each(function (cell) {
        event.preventDefault();
        const navigation: any = event.shiftKey ? backward : forward;
        const rng = navigation(editor, isRoot, cell, actions, lazyWire);
        rng.each(function (range) {
          editor.selection.setRng(range);
        });
      });
    }
  }
};

export default {
  handle
};