## ADDED Requirements

### Requirement: `Dialog` SHALL be safe to render inside table structures

The shared `Dialog` primitive SHALL be safe to use from components rendered within table markup (e.g., inside rows). The implementation SHALL ensure the `<dialog>` element is not mounted as a descendant of invalid container elements such as `<tbody>`.

#### Scenario: Dialog used from a table row does not trigger DOM nesting warnings
- **WHEN** a feature renders a `Dialog` from within a table row component
- **THEN** the browser console shows no `validateDOMNesting(...): <dialog> cannot appear as a child of <tbody>` warning
