# ButtonEvents
Source: https://pixijs.io/ui/ButtonEvents.html
### Members

#### isDown boolean

Getter that returns if the button is down.

#### onDown Signal<(btn: FederatedPointerEvent, e: this) => void>

Event that is fired when the button is down.

#### onHover Signal<(btn: FederatedPointerEvent, e: this) => void>

Event that is fired when the mouse hovers the button. Fired only if device is not mobile.

#### onOut Signal<(btn: FederatedPointerEvent, e: this) => void>

Event that fired when the mouse is out of the view

#### onPress Signal<(btn: FederatedPointerEvent, e: this) => void>

Event that is fired when the button is pressed.

#### onUp Signal<(btn: FederatedPointerEvent, e: this) => void>

Event that fired when a down event happened inside the button and up event happened inside or outside of the button

#### onUpOut Signal<(btn: FederatedPointerEvent, e: this) => void>

Event that fired when mouse up event happens outside of the button after the down event happened inside the button boundaries.

### Methods

#### down (_e)

Method called when the button pressed. To be overridden.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| _e | FederatedPointerEvent | <optional> | event data |

#### hover (_e)

Method called when the mouse hovers the button. To be overridden. Fired only if device is not mobile.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| _e | FederatedPointerEvent | <optional> | event data |

#### out (_e)

Method called when the mouse leaves the button. To be overridden.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| _e | FederatedPointerEvent | <optional> | event data |

#### press (_e)

Method called when the mouse press down the button. To be overridden.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| _e | FederatedPointerEvent | <optional> | event data |

#### up (_e)

Method called when the button is up. To be overridden.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| _e | FederatedPointerEvent | <optional> | event data |

#### upOut (_e)

Method called when the up event happens outside of the button, after the down event happened inside the button boundaries. To be overridden.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| _e | FederatedPointerEvent | <optional> | event data |
