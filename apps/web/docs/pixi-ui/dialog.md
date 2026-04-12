# Dialog
Source: https://pixijs.io/ui/Dialog.html
#### new Dialog (options)

Modal dialog component for asking users questions.

| Name | Type | Description |
| --- | --- | --- |
| options | DialogOptions | Configuration options for the dialog. |
| options.backdrop | string | Texture | Container | Sprite | Graphics | Backdrop view or settings. |
| options.backdropColor | number | Color of the backdrop (if backdrop is not provided). |
| options.backdropAlpha | number | Alpha of the backdrop (if backdrop is not provided). |
| options.background | string | Texture | Container | Sprite | Graphics | Background view or settings for the dialog. |
| options.title | string | Texture | Container | Sprite | Graphics | Title text or settings for the dialog. |
| options.content | string | Texture | Container | Sprite | Graphics | Array<Container> | Content text, view, or array of views for the dialog. |
| options.width | number | Width of the dialog. |
| options.height | number | Height of the dialog. |
| options.padding | number | Padding around the dialog content. |
| options.buttons | unknown | Array of button configurations or instances. |
| options.buttonList | ListOptions<Container> | Configuration options for the button list layout. |
| options.scrollBox | ScrollBoxOptions | Configuration options for the scroll box containing the content. |
| options.animations | object | Animation settings for opening and closing the dialog. |
| options.animations.open | Animation | Animation settings for opening the dialog. |
| options.animations.close | Animation | Animation settings for closing the dialog. |
| options.closeOnBackdropClick | boolean | Whether to close the dialog when clicking on the backdrop. |
| options.nineSliceSprite | unknown | Nine-slice scaling settings for the background. |

### Example

```ts
const dialog = new Dialog({
    background: new Graphics().roundRect(0, 0, 400, 200, 20).fill(0xFFFFFF),
    title: 'Confirm',
    content: 'Are you sure?',
    buttons: [
        { text: 'Cancel' },
        { text: 'OK' }
    ]
});
dialog.onSelect.connect((index, text) => {
    console.log(`Button ${index} clicked: ${text}`);
});
dialog.open();
```

### Extends

- Container

### Members

#### isOpen boolean

Gets the open state of the dialog.

#### onClose Signal<() => void>

Signal emitted when the dialog is closed.

#### onSelect Signal<(buttonIndex: number, buttonText: string) => void>

Signal emitted when a button is selected.

#### dialogHeight number protected

Gets the dialog height from options or innerView.

#### dialogPadding number protected

Gets the dialog padding from options.

#### dialogWidth number protected

Gets the dialog width from options or innerView.

### Methods

#### close () void

Closes the dialog with animation.

#### hide () void

Hides the dialog (alias for close).

#### open () void

Opens the dialog with animation.

#### show () void

Shows the dialog (alias for open).

#### initBackdrop () void protected

Initializes the backdrop (semi-transparent background).

#### initButtons () void protected

Initializes the buttons at the bottom of the dialog.

#### initContent () void protected

Initializes the content area, optionally wrapped in ScrollBox.

#### initInnerView () void protected

Initializes the inner view (background panel).

#### initTitle () void protected

Initializes the title text if provided.
