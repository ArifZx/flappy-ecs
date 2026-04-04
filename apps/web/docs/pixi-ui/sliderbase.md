# SliderBase
Source: https://pixijs.io/ui/SliderBase.html
### Extends

- ProgressBar

### Members

#### max

Set max value.

#### max number

Get max value.

#### min

Set min value.

#### min number

Get min value.

#### slider1

Sets Slider1 instance.

#### slider1 Container | undefined

Get Slider1 instance.

#### slider2

Sets Slider2 instance.

#### slider2 Container | undefined

Get Slider2 instance.

#### step

Set step value.

#### step number

Get step value.

#### _max number protected

Maximal value.

- Default Value:: 100

#### _min number protected

Minimal value.

- Default Value:: 0

#### _step number protected

Progress value step

- Default Value:: 1

### Methods

#### setBackground (bg) overrides

Set bg.

| Name | Type | Description |
| --- | --- | --- |
| bg | ProgressBarViewType |  |

#### change () protected

Called when dragging stopped.

### Inherited Properties

#### From class ProgressBar

#### height inherited overrides

Sets height of a ProgressBars background and fill. If nineSliceSprite is set, then height will be set to nineSliceSprite. If nineSliceSprite is not set, then height will control components height as Container.

#### innerView Container inherited

Container, that holds all inner views.

#### progress inherited overrides

Set current progress percentage value.

#### width inherited overrides

Sets width of a ProgressBars background and fill. If nineSliceSprite is set, then width will be set to nineSliceSprite. If nineSliceSprite is not set, then width will control components width as Container.

### Inherited Methods

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
