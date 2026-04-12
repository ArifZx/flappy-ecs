# Input
Source: https://pixijs.io/ui/Input.html
#### new Input (options)

Creates an input.

| Name | Type | Description |
| --- | --- | --- |
| options | number | Options object to use. |
| options.bg | Sprite | Graphics | Texture | string | Background of the Input. Can be a string (name of texture) or an instance of Texture, Sprite or Graphics. If you want to use NineSliceSprite, you have to pass a text (name of texture) or an instance of Texture as a parameter. |
| options.textStyle | PixiTextStyle | Text style of the Input. |
| options.placeholder | string | Placeholder of the Input. |
| options.value | string | Value of the Input. |
| options.maxLength | number | Max length of the Input. |
| options.align | 'left' | 'center' | 'right' | Align of the Input. |
| options.padding | Padding | Padding of the Input. |
| options.padding.top | number | Top padding of the Input. |
| options.padding.right | number | Right padding of the Input. |
| options.padding.bottom | number | Bottom padding of the Input. |
| options.padding.left | number | Left padding of the Input. |
| options.cleanOnFocus | boolean | Clean Input on focus. |
| options.addMask | boolean | Add mask to the Input text, so it is cut off when it does not fit. |
| options.nineSliceSprite | Array | NineSliceSprite values for bg and fill ([number, number, number, number]). !!! IMPORTANT: To make it work, you have to pass a texture name or texture instance as a bg parameter. |

### Example

```ts
new Input({
    bg: Sprite.from('input.png'),
    placeholder: 'Enter text',
    padding: {
     top: 11,
     right: 11,
     bottom: 11,
     left: 11
    } // alternatively you can use [11, 11, 11, 11] or [11, 11] or just 11
});
```

### Extends

- Container

### Members

#### height

Sets height of a Input. If nineSliceSprite is set, then height will be set to nineSliceSprite. If nineSliceSprite is not set, then height will control components height as Container.

#### height number

Gets height of Input.

#### onChange Signal<(text: string) => void>

Fires every time input string is changed.

#### onEnter Signal<(text: string) => void>

Fires when input loses focus.

#### padding [number, number, number, number]

Set paddings

#### paddingBottom number

Bottom side padding

- Default Value:: 0

#### paddingLeft number

Left side padding

- Default Value:: 0

#### paddingRight number

Right side padding

- Default Value:: 0

#### paddingTop number

Top side padding

- Default Value:: 0

#### value

Sets the input text.

#### value string

Return text of the input.

#### width

Sets width of a Input. If nineSliceSprite is set, then width will be set to nineSliceSprite. If nineSliceSprite is not set, then width will control components width as Container.

#### width number

Gets width of Input.
