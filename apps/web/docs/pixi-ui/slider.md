# Slider
Source: https://pixijs.io/ui/Slider.html
### Example

```ts
 new Slider({
     bg: 'slider_bg.png',
     fill: 'slider.png',
     slider: 'slider.png',
     min: 0,
     max: 100,
     value: 50,
 });

 singleSlider.onChange.connect((value) => {
     console.log(`Slider changed to ${value}`);
 });
```

### Extends

- SliderBase

### Members

#### height

Sets height of a Sliders background and fill. If nineSliceSprite is set, then height will be set to nineSliceSprite. If nineSliceSprite is not set, then height will control components height as Container.

#### height number overrides

Gets height of a Slider.

#### onChange Signal<(value: number) => void>

Fires when value changed, only when slider is released.

#### onUpdate Signal<(value: number) => void>

Fires when value is changing, on every move of slider.

#### slider

Set slider instance ot texture.

#### value number

Return selected value.

#### value

Set selected value.

#### width

Sets width of a Sliders background and fill. If nineSliceSprite is set, then width will be set to nineSliceSprite. If nineSliceSprite is not set, then width will control components width as Container.

#### width number overrides

Gets width of a Slider.

### Inherited Properties

#### From class SliderBase

#### max inherited overrides

Set max value.

#### min inherited overrides

Set min value.

#### slider1 inherited overrides

Sets Slider1 instance.

#### slider2 inherited overrides

Sets Slider2 instance.

#### step inherited overrides

Set step value.

#### _max number protected inherited

Maximal value.

- Default Value:: 100

#### _min number protected inherited

Minimal value.

- Default Value:: 0

#### _step number protected inherited

Progress value step

- Default Value:: 1

#### From class ProgressBar

#### innerView Container inherited

Container, that holds all inner views.

#### progress inherited

Set current progress percentage value.

### Inherited Methods

#### From class SliderBase

#### setBackground (bg) inherited

Set bg.

| Name | Type | Description |
| --- | --- | --- |
| bg | ProgressBarViewType |  |

#### change () protected inherited

Called when dragging stopped.

#### From class ProgressBar

#### init (root0) inherited

Initialize ProgressBar.

| Name | Type | Description |
| --- | --- | --- |
| root0 | ProgressBarOptions |  |
| root0.bg | Background texture. |  |
| root0.fill | Fill texture. |  |
| root0.fillPaddings | Fill offset. |  |
| root0.progress | Initial progress value. |  |

#### setFill (fill, fillPadding) inherited

Set fill.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| fill | ProgressBarViewType |  |  |
| fillPadding | FillPaddings | <optional> |  |
