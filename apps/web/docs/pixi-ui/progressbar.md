# ProgressBar
Source: https://pixijs.io/ui/ProgressBar.html
#### new ProgressBar (options)

Creates a ProgressBar.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| options | ProgressBarOptions | <optional> | Options. |
| options.bg | Sprite | Graphics | Texture | string | Background of the ProgressBar. If you pass a string, it will be used as a texture name. If you want to use NineSliceSprite, you have to pass a text (name of texture) or an instance of Texture as a parameter here. |  |
| options.fill | Sprite | Graphics | Texture | string | Fill of the ProgressBar. If you pass a string, it will be used as a texture name. If you want to use NineSliceSprite, you have to pass a text (name of texture) or an instance of Texture as a parameter here. |  |
| options.fillPaddings | FillPaddings | Fill offsets. |  |
| options.fillPaddings.top | number | Fill top offset. |  |
| options.fillPaddings.right | number | Fill right offset. |  |
| options.fillPaddings.bottom | number | Fill bottom offset. |  |
| options.fillPaddings.left | number | Fill left offset. |  |
| options.nineSliceSprite | NineSliceSprite | NineSliceSprite values for bg and fill. |  |
| options.nineSliceSprite.bg | Array | NineSliceSprite config for bg ([number, number, number, number]). !!! IMPORTANT: To make it work, you have to pass a bg parameter as texture name or texture instance. |  |
| options.nineSliceSprite.fill | Array | NineSliceSprite config fill ([number, number, number, number]). !!! IMPORTANT: To make it work, you have to pass a fill parameter as texture name or texture instance. |  |
| options.progress | number | Initial progress value. |  |

### Example

```ts
new ProgressBar({
    bg: 'slider_bg.png',
    fill: 'slider.png',
    progress: 50,
});
```

### Extends

- Container

### Members

#### height

Sets height of a ProgressBars background and fill. If nineSliceSprite is set, then height will be set to nineSliceSprite. If nineSliceSprite is not set, then height will control components height as Container.

#### height number

Gets height of a ProgressBar.

#### innerView Container

Container, that holds all inner views.

#### progress

Set current progress percentage value.

#### progress number

Return current progress percentage value.

#### width

Sets width of a ProgressBars background and fill. If nineSliceSprite is set, then width will be set to nineSliceSprite. If nineSliceSprite is not set, then width will control components width as Container.

#### width number

Gets width of a ProgressBar.

### Methods

#### init (root0)

Initialize ProgressBar.

| Name | Type | Description |
| --- | --- | --- |
| root0 | ProgressBarOptions |  |
| root0.bg | Background texture. |  |
| root0.fill | Fill texture. |  |
| root0.fillPaddings | Fill offset. |  |
| root0.progress | Initial progress value. |  |

#### setBackground (bg)

Set bg.

| Name | Type | Description |
| --- | --- | --- |
| bg | ProgressBarViewType |  |

#### setFill (fill, fillPadding)

Set fill.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| fill | ProgressBarViewType |  |  |
| fillPadding | FillPaddings | <optional> |  |
