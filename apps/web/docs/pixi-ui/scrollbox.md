# ScrollBox
Source: https://pixijs.io/ui/ScrollBox.html
#### new ScrollBox (options)

| Name | Type | Attributes | Default | Description |
| --- | --- | --- | --- | --- |
| options | ScrollBoxOptions | <optional> |  |  |
| options.background | number | background color of the ScrollBox. |  |  |
| options.width | number | width of the ScrollBox. |  |  |
| options.height | number | height of the ScrollBox. |  |  |
| options.radius | number | radius of the ScrollBox and its masks corners. |  |  |
| options.elementsMargin | number | margin between elements. |  |  |
| options.vertPadding | number | vertical padding of the ScrollBox. |  |  |
| options.horPadding | number | horizontal padding of the ScrollBox. |  |  |
| options.padding | number | padding of the ScrollBox (same horizontal and vertical). |  |  |
| options.disableDynamicRendering | boolean | disables dynamic rendering of the ScrollBox, so even elements the are not visible will be rendered. Be careful with this options as it can impact performance. |  |  |
| options.globalScroll | boolean | <optional> | true | if true, the ScrollBox will scroll even if the mouse is not over it. |
| options.shiftScroll | boolean | <optional> | false | if true, the ScrollBox will only scroll horizontally if the shift key is pressed, and the type is set to 'horizontal'. |

### Example

```ts
new ScrollBox({
    background: 0XFFFFFF,
    width: 200,
    height: 300,
    items: [
        new Graphics().drawRect(0, 0, 200, 50).fill(0x000000),
        new Graphics().drawRect(0, 0, 200, 50).fill(0x000000),
        new Graphics().drawRect(0, 0, 200, 50).fill(0x000000),
        new Graphics().drawRect(0, 0, 200, 50).fill(0x000000),
        new Graphics().drawRect(0, 0, 200, 50).fill(0x000000),
        new Graphics().drawRect(0, 0, 200, 50).fill(0x000000),
        new Graphics().drawRect(0, 0, 200, 50).fill(0x000000),
    ],
});
```

### Extends

- Container

### Members

#### height number

Gets component height.

#### items Container[] | []

Returns all inner items in a list.

#### list List | undefined

Arrange container, that holds all inner elements. Use this control inner arrange container size in case of bidirectional scroll type.

#### scrollX number

Gets the current raw scroll position on the x-axis (Negated Value).

#### scrollX

Sets the current raw scroll position on the x-axis (Negated Value).

#### scrollY number

Gets the current raw scroll position on the y-axis (Negated Value).

#### scrollY

Sets the current raw scroll position on the y-axis (Negated Value).

#### width number

Gets component width.

### Methods

#### addItem (…items) T[0]

Adds one or more items to a scrollable list.

| Name | Type | Description |
| --- | --- | --- |
| items | Container | one or more items to add. |

##### Returns:

| Type | Description |
| --- | --- |
| T[0] |  |

#### addItems (items)

Adds array of items to a scrollable list.

| Name | Type | Description |
| --- | --- | --- |
| items | Array<Container> | items to add. |

#### destroy (options)

Destroys the component.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| options | boolean | DestroyOptions | <optional> | Options parameter. A boolean will act as if all options have been set to that value |

#### init (options)

Initiates ScrollBox.

| Name | Type | Attributes | Default | Description |
| --- | --- | --- | --- | --- |
| options | ScrollBoxOptions |  |  |  |
| options.background | number | background color of the ScrollBox. |  |  |
| options.width | number | width of the ScrollBox. |  |  |
| options.height | number | height of the ScrollBox. |  |  |
| options.radius | number | radius of the ScrollBox and its masks corners. |  |  |
| options.elementsMargin | number | margin between elements. |  |  |
| options.vertPadding | number | vertical padding of the ScrollBox. |  |  |
| options.horPadding | number | horizontal padding of the ScrollBox. |  |  |
| options.padding | number | padding of the ScrollBox (same horizontal and vertical). |  |  |
| options.disableDynamicRendering | boolean | disables dynamic rendering of the ScrollBox, so even elements the are not visible will be rendered. Be careful with this options as it can impact performance. |  |  |
| options.globalScroll | boolean | <optional> | true | if true, the ScrollBox will scroll even if the mouse is not over it. |
| options.shiftScroll | boolean | <optional> | false | if true, the ScrollBox will only scroll horizontally if the shift key |

#### isItemVisible (item, padding) boolean

Checks if the item is visible or scrolled out of the visible part of the view.* Adds an item to a scrollable list.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| item | Container | item to check. |  |
| padding | number | 0 | proximity padding to consider the item visible. |

##### Returns:

| Type | Description |
| --- | --- |
| boolean |  |

#### removeItem (itemID)

Removes an item from a scrollable list.

| Name | Type | Description |
| --- | --- | --- |
| itemID | number | id of the item to remove. |

#### removeItems ()

Remove all items from a scrollable list.

#### resize (force) void

Controls item positions and visibility.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| force | boolean | false |  |

#### scrollBottom ()

Makes it scroll down to the last element.

#### scrollTo (elementID)

Scrolls to the element with the given ID.

| Name | Type | Description |
| --- | --- | --- |
| elementID | number |  |

#### scrollTop ()

Makes it scroll up to the first element.

#### scrollToPosition (position)

Scrolls to the given position.

| Name | Type | Description |
| --- | --- | --- |
| position | Partial<PointData> | x and y position object. |
| position.x | x position. |  |
| position.y | y position. |  |

#### setBackground (background)

Set ScrollBox background.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| background | number | string | <optional> | background color or texture. |
