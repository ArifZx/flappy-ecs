# Switcher
Source: https://pixijs.io/ui/Switcher.html
#### new Switcher (views, triggerEvents, activeViewID)

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| views | Array<Container | string> | <optional> | Array of views or textures that will be switching. |
| triggerEvents | ButtonEvent | ButtonEvent[] | <optional> | Button events, to switch views (can be one event or an array of events). |
| activeViewID | number | <optional> | The id of the view, visible by default. |

### Example

```ts
 // switch on onPress
 const switch = new Swich([`switch_off.png`, `switch_on.png`]);

 // switch on hover
 const button = new Swich([`button_default.png`, `button_hover.png`], ['onHover', 'onOut']);

 button.events.onPress.connect(() => console.log('button pressed'));
```

### Extends

- Container

### Members

#### active

Sets the id of the visible(active) view and shows to it.

#### active number | undefined

Gets the id of the visible(active) view.

#### activeView Container | undefined

Returns the active view.

#### innerView Container

Container that holds all the content of the component.

#### onChange Signal<(state: number | boolean) => void>

Fired when active view changes.

#### triggerEvents

Sets a list of events that will make a switcher switch to the next view.

#### triggerEvents ButtonEvent[]

Returns a list of events that will make a switcher switch to the next view.

#### views

Sets the list of instances for switching.

#### views Array<Container>

Returns all the switchable views

#### _active number | undefined protected

The id of the visible(active) view.

#### nextActive number | undefined protected

Returns the id of the next view in order. Or undefined, if order is empty.

### Methods

#### add (view) void

Adds view instance to a switching list.

| Name | Type | Description |
| --- | --- | --- |
| view | GetViewSettings |  |

#### forceSwitch (id)

Switches a view to a given one without triggering the onChange event.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| id | number | <optional> | optional id of the view to show. If not set, will switch to the next view. |

#### remove (id)

Removes view instance from a switching list by id.

| Name | Type | Description |
| --- | --- | --- |
| id | number | id of the view to remove. |

#### switch (id)

Show a view by id, or to next one by order, if no ID provided.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| id | number | <optional> | optional id of the view to show. If not set, will switch to the next view. |
