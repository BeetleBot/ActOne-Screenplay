# Editor line numbers

The shared CodeMirror editor uses a reconfigurable lineNumbers gutter for screenplay and prose. The global LINE_NUMBERS_ENABLED preference defaults to true, persists in local storage, and follows existing settings broadcasts. Settings > Editor and the Show/Hide Line Numbers palette command update the same preference. Numbers count source lines, not visual wrapped rows or screenplay scene numbers, and do not change exported text.

The native line-number gutter is positioned at the left edge of the editor workspace, independently of the centered paper. A ResizeObserver and CodeMirror measurement pass update its horizontal offset when workspace/editor dimensions change. Native gutter layout retains vertical alignment and wrapping measurements.

The cursor line uses CodeMirror highlightActiveLineGutter with a bold number, background and small inset marker. It follows selection changes and is removed together with the line-number extension when disabled.
