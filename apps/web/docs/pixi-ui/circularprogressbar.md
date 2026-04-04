# CircularProgressBar
Source: https://pixijs.io/ui/CircularProgressBar.html
#### new CircularProgressBar (options)

Creates a Circular ProgressBar.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| options | MaskedProgressBarOptions | <optional> | Options object to use. |
| options.backgroundColor | ColorSource | Background color. |  |
| options.fillColor | ColorSource | Fill color. |  |
| options.lineWidth | number | Line width. |  |
| options.radius | number | Radius. |  |
| options.value | number | Progress value. |  |
| options.backgroundAlpha | number | Background alpha. |  |
| options.fillAlpha | number | Fill alpha. |  |
| options.cap | 'butt' | 'round' | 'square' | Line cap. |  |

### Example

```ts
 const progressBar = new CircularProgressBar({
    backgroundColor: 0x000000,
    backgroundAlpha: 0.5,
    lineWidth: 10,
    fillColor: 0xFFFFFF,
    radius: 50,
    value: 50,
    cap: 'round'
 });

 progressBar.progress = 100;
```

### Extends

- Container

### Members

#### innerView

Container, that holds all inner views.

#### progress

Set progress value.

#### progress number

Current progress value.
