# Button
Source: https://pixijs.io/ui/Button.html
#### new Button (view)

Turns a given container-based view into a button by adding all button events.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| view | Container | <optional> | instance of container, to be turned into button. |

### Example

```ts
 const container = new Container();
 const button = new Button(
      new Graphics()
          .rect(0, 0, 100, 50, 15)
          .fill(0xFFFFFF)
 );

 button.onPress.connect(() => console.log('onPress'));

 container.addChild(button.view);
```

### Extends

- ButtonEvents

### Members

#### enabled

Switcher, which prevents all button events from firing if off.

#### enabled boolean

Getter that returns button state.

#### view

Set button view, that all the interaction events are applied to.

#### view Container | undefined

Get button view, that all the interaction events are applied to.

#### _view Container | undefined protected

Container, given as a constructor parameter that is a button view.

### Inherited Properties

#### From class ButtonEvents

#### isDown boolean inherited

Getter that returns if the button is down.

#### onDown Signal<(btn: FederatedPointerEvent, e: this) => void> inherited

Event that is fired when the button is down.

#### onHover Signal<(btn: FederatedPointerEvent, e: this) => void> inherited

Event that is fired when the mouse hovers the button. Fired only if device is not mobile.

#### onOut Signal<(btn: FederatedPointerEvent, e: this) => void> inherited

Event that fired when the mouse is out of the view

#### onPress Signal<(btn: FederatedPointerEvent, e: this) => void> inherited

Event that is fired when the button is pressed.

#### onUp Signal<(btn: FederatedPointerEvent, e: this) => void> inherited

Event that fired when a down event happened inside the button and up event happened inside or outside of the button

#### onUpOut Signal<(btn: FederatedPointerEvent, e: this) => void> inherited

Event that fired when mouse up event happens outside of the button after the down event happened inside the button boundaries.

### Inherited Methods

#### From class ButtonEvents

#### down (_e) inherited

Method called when the button pressed. To be overridden.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| _e | FederatedPointerEvent | <optional> | event data |

#### hover (_e) inherited

Method called when the mouse hovers the button. To be overridden. Fired only if device is not mobile.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| _e | FederatedPointerEvent | <optional> | event data |

#### out (_e) inherited

Method called when the mouse leaves the button. To be overridden.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| _e | FederatedPointerEvent | <optional> | event data |

#### press (_e) inherited

Method called when the mouse press down the button. To be overridden.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| _e | FederatedPointerEvent | <optional> | event data |

#### up (_e) inherited

Method called when the button is up. To be overridden.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| _e | FederatedPointerEvent | <optional> | event data |

#### upOut (_e) inherited

Method called when the up event happens outside of the button, after the down event happened inside the button boundaries. To be overridden.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| _e | FederatedPointerEvent | <optional> | event data |
