# Select
Source: https://pixijs.io/ui/Select.html
### Example

```ts
new Select({
    closedBG: `select_closed.png`,
    openBG: `select_open.png`,
    textStyle: { fill: 0xffffff, fontSize: 20 },
    items: {
        items,
        backgroundColor: 0x000000,
        hoverColor: 0x000000,
        width: 200,
        height: 50,
    },
    scrollBox: {
        width: 200,
        height: 350,
        radius: 30,
    },
});
```

### Extends

- Container

### Members

#### onSelect Signal<(value: number, text: string) => void>

Fires when selected value is changed.

#### value number

Selected value ID.

- Default Value:: -1

### Methods

#### addItems (items, selected)

Adds items to the dropdown.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| items | SelectItemsOptions |  |  |
| selected | number | 0 |  |

#### close ()

Hide dropdown.

#### init (root0)

Initiates Select.

| Name | Type | Description |
| --- | --- | --- |
| root0 | SelectOptions |  |
| root0.closedBG |  |  |
| root0.textStyle |  |  |
| root0.items |  |  |
| root0.openBG |  |  |
| root0.selected |  |  |
| root0.selectedTextOffset |  |  |
| root0.scrollBox |  |  |
| root0.visibleItems |  |  |
| root0.TextClass |  |  |

#### open ()

Show dropdown.

#### removeItem (itemID)

Remove items from the dropdown.

| Name | Type | Description |
| --- | --- | --- |
| itemID | number | Item to remove (starting from 0). |

#### toggle ()

Toggle the select state (open if closed, closes - id open).
