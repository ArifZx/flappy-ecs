# RadioGroup
Source: https://pixijs.io/ui/RadioGroup.html
### Example

```ts
new RadioGroup({
    items: [
         new CheckBox({
             style: {
                 unchecked: `switch_off.png`,
                 checked: `switch_on.png`,
             }
         }),
        new CheckBox({
             style: {
                 unchecked: `switch_off.png`,
                 checked: `switch_on.png`,
             }
         }),
         new CheckBox({
             style: {
                 unchecked: `switch_off.png`,
                 checked: `switch_on.png`,
             }
         }),
    ],
    type: 'vertical'
});
```

### Extends

- Container

### Members

#### innerView List | undefined

List, that holds and control all inned checkboxes.

#### onChange Signal<(selectedItemID: number, selectedVal: string) => void>

Fires, when new item is selected.

#### selected number

ID of the selected item.

- Default Value:: 0

#### value string

Text value of the selected item.

- Default Value:: ""

### Methods

#### addItems (items)

Add items to a group.

| Name | Type | Description |
| --- | --- | --- |
| items | Array<CheckBox> | array of CheckBox instances. |

#### init (options)

Initiates a group.

| Name | Type | Description |
| --- | --- | --- |
| options | RadioBoxOptions |  |

#### removeItems (ids)

Remove items from a group.

| Name | Type | Description |
| --- | --- | --- |
| ids | number[] |  |

#### selectItem (id)

Select item by ID.

| Name | Type | Description |
| --- | --- | --- |
| id | number |  |
