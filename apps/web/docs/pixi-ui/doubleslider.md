# DoubleSlider
Source: https://pixijs.io/ui/DoubleSlider.html
### Example

```ts
 const doubleSlider = new DoubleSlider({
      bg: 'slider_bg.png',
      fill: 'slider_progress.png',
      slider1: 'slider.png',
      slider2: 'slider.png',
  });

 doubleSlider.onChange.connect((value1, value2) =>
     console.log(`New slider range ${value1} - ${value2}`)S
 );
```

### Extends

- SliderBase

### Members

#### height

Sets height of a Sliders background and fill. If nineSliceSprite is set, then height will be set to nineSliceSprite. If nineSliceSprite is not set, then height will control components height as Container.

#### height number overrides

Gets height of a Slider.

#### onChange Signal<(value1: number, value2: number) => void>

Signal that fires when value have changed.

#### onUpdate Signal<(value1: number, value2: number) => void>

Signal that fires when value is changing.

#### slider1

Set Slider1 instance.

#### slider1 Container | undefined overrides

Get Slider1 instance.

#### slider2

Sets Slider instance.

#### slider2 Container | undefined overrides

Get Slider2 instance.

#### value1 number

Returns left value.

#### value1

Sets left value.

#### value2 number

Returns right value.

#### value2

Sets right value.

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
