# List
Source: https://pixijs.io/ui/List.html
### Example

```ts
 const list = new List({
    children: [
        new Graphics().rect(0, 0, 50, 50).fill(0x000000),
        new Graphics().rect(0, 0, 50, 50).fill(0xFFFFFF),
    ],
 });

 list.addChild(new Graphics().rect(0, 0, 50, 50)).fill(0x000000);
```

### Members

#### bottomPadding

Set bottom padding.

#### bottomPadding number

Get bottom padding.

#### children C[] readonly

Returns all arranged elements.

#### elementsMargin

Set element margin.

#### elementsMargin number

Get element margin.

#### horPadding

Set horizontal padding, overriding all left and right padding options.

#### horPadding number

Get horizontal padding.

#### leftPadding

Set left padding.

#### leftPadding number

Get left padding.

#### maxWidth

Set width of area to fit elements when arrange. (If not set parent width will be used).

#### maxWidth number

Get width of area to fit elements when arrange. (If not set parent width will be used).

#### padding

Set padding, overriding all padding options.

#### padding number

Get padding.

#### rightPadding

Set right padding.

#### rightPadding number

Get right padding.

#### topPadding

Set top padding.

#### topPadding number

Get top padding.

#### type

Set items arrange direction.

#### type ListType

Get items arrange direction.

#### vertPadding

Set vertical padding, overriding all top and bottom padding options.

#### vertPadding number

Get vertical padding.

#### _maxWidth number protected

Width of area to fit elements when arrange. (If not set parent width will be used).

- Default Value:: 0

#### _type ListType protected

Arrange direction. Defaults to 'bidirectional' for multi-column layout when type is not specified.

- Default Value:: "bidirectional"

### Methods

#### arrangeChildren ()

Arrange all elements basing in their sizes and component options. Can be arranged vertically, horizontally or bidirectional.

#### init (options)

Initiates list component.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| options | { type? : ListType } & C<ListOptions> | <optional> |  |

#### removeItem (itemID)

Removes items from the list. (Does not destroy them)

| Name | Type | Description |
| --- | --- | --- |
| itemID | number | Item to remove (starting from 0). |
