# MaskedFrame
Source: https://pixijs.io/ui/MaskedFrame.html
### Example

```ts
new MaskedFrame({
    target: `avatar.png`,
    mask: `avatar_mask.png`,
    borderWidth: 5,
    borderColor: 0xFFFFFF,
});
```

### Extends

- Container

### Members

#### target Container | undefined

Target container.

### Methods

#### applyMask (mask)

Applies a mask to a target container.

| Name | Type | Description |
| --- | --- | --- |
| mask | string | Graphics |  |

#### hideBorder ()

Hides a border.

#### init (root0)

Initializes a component.

| Name | Type | Description |
| --- | --- | --- |
| root0 | MaskedFrameOptions |  |
| root0.target | Container to apply a mask or a border. |  |
| root0.mask | Mask. |  |
| root0.borderWidth | Border width. |  |
| root0.borderColor | Border color. |  |

#### setBorder (borderWidth, borderColor)

Shows a border around the target Container, same shape as the mask.

| Name | Type | Description |
| --- | --- | --- |
| borderWidth | number |  |
| borderColor | FillStyleInputs |  |

#### showBorder ()

Hides a border.
