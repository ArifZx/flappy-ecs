# CheckBox
Source: https://pixijs.io/ui/CheckBox.html
### Example

```ts
new CheckBox({
   style: {
       unchecked: `switch_off.png`,
       checked: `switch_on.png`,
   }
});
```

### Extends

- Switcher

### Members

#### checked boolean

Getter, which returns a checkbox state.

#### checked

Setter, which sets a checkbox state.

#### onCheck Signal<(state: boolean) => void>

Signal emitted when checkbox state changes.

#### style

Setter, which sets a checkbox style settings.

#### style CheckBoxStyle | undefined

Getter, which returns a checkbox style settings.

#### text

Setter, which sets a checkbox text.

#### text string | ""

Getter, which returns a checkbox text.

### Methods

#### forceCheck (checked)

Setter, that sets a checkbox state without emitting a signal.

| Name | Type | Description |
| --- | --- | --- |
| checked | boolean |  |

#### alignText () protected

Aligns the text label based on the checkbox style. This method calculates the position of the text label based on the checkbox's unchecked view dimensions and applies any specified text offsets. It ensures that the text label is centered vertically and positioned to the right of the checkbox with an optional offset. This method is called after the checkbox style is set or when the text label is updated to ensure that the text label is always correctly positioned relative to the checkbox.

- See:: CheckBoxStyle.textOffset for offset options. getView for how views are created.

### Inherited Properties

#### From class Switcher

#### active inherited overrides

Sets the id of the visible(active) view and shows to it.

#### activeView Container | undefined inherited

Returns the active view.

#### innerView Container inherited

Container that holds all the content of the component.

#### onChange Signal<(state: number | boolean) => void> inherited

Fired when active view changes.

#### triggerEvents inherited overrides

Sets a list of events that will make a switcher switch to the next view.

#### views inherited overrides

Sets the list of instances for switching.

#### _active number | undefined protected inherited

The id of the visible(active) view.

#### nextActive number | undefined protected inherited

Returns the id of the next view in order. Or undefined, if order is empty.

### Inherited Methods

#### From class Switcher

#### add (view) void inherited

Adds view instance to a switching list.

| Name | Type | Description |
| --- | --- | --- |
| view | GetViewSettings |  |

#### forceSwitch (id) inherited

Switches a view to a given one without triggering the onChange event.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| id | number | <optional> | optional id of the view to show. If not set, will switch to the next view. |

#### remove (id) inherited

Removes view instance from a switching list by id.

| Name | Type | Description |
| --- | --- | --- |
| id | number | id of the view to remove. |

#### switch (id) inherited

Show a view by id, or to next one by order, if no ID provided.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| id | number | <optional> | optional id of the view to show. If not set, will switch to the next view. |
