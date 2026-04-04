# Full docs
Source: https://pixijs.io/ui/
### It is a library that contains commonly used UI components, that are extensible to allow them to be used in any project

Here are some useful resources:

- Full docs
- Github Repo
- Sandbox

We are now a part of the Open Collective and with your support you can help us make PixiJS even better. To make a donation, simply click the button below and we'll love you forever!

## Compatibility

Depending on your version of PixiJS, you'll need to figure out which major version of PixiUI to use.

| PixiJS | PixiUI |
| --- | --- |
| v7.x | v1.x |
| v8.x | v2.x |

## Install

```ts
npm install @pixi/ui
```

There is no default export. The correct way to import pixi-ui is:

## Usage

```ts
import { Button } from '@pixi/ui';

const button = new Button();

button.onPress.connect(() => console.log('Button pressed!'));
```

To use any of the components you can go to it's page in the sandbox, and copy/paste the example code to your project (check the Code tab):

## Components

- Switcher
- Button
- CheckBox
- FancyButton
- Input
- List
- MaskedFrame
- ProgressBar
- RadioGroup
- ScrollBox
- Select
- Slider

### Contribute

Want to be part of the PixiUI project? Great! All are welcome! We will get there quicker together :) Whether you find a bug, have a great feature request, or you fancy owning a task from the road map above, feel free to get in touch.

Make sure to read the Contributing Guide before submitting changes.

### License

This content is released under the (http://opensource.org/licenses/MIT) MIT License.

## Known Issues

This library requires Pixi v7.1.1 or higher as this is when the globalpointermove event was added See here for details
