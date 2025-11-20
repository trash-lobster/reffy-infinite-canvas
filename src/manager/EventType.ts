export const ContextMenuEvent = {
    Open: 'opencontextmenu',
    Close: 'closecontextmenu',
} as const;

export const CanvasEvent = {
    Dirty: 'dirty',
    Save: 'save',
    SelectionChanged: 'selectionchanged',
    Render: 'render',
    Resize: 'resize',
    Zoom: 'zoom',
    ModeChange: 'modechange',
    HistoryChange: 'historychange',
    PointerDown: 'pointerdown',
    PointerUp: 'pointerup',
    PointerMove: 'pointermove',
    ImageAdded: 'imageadded',
    ImageRemoved: 'imageremoved',
} as const;

export const CustomClipboardEvent = {
    Copy: 'copy',
    Cut: 'cut',
    Paste: 'paste',
} as const;