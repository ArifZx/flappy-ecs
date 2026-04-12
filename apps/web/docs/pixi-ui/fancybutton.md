# FancyButton
Source: https://pixijs.io/ui/FancyButton.html
#### new FancyButton (options)

Creates a button with a lot of tweaks.

| Name | Type | Attributes | Description |
| --- | --- | --- | --- |
| options | object | <optional> | Button options. |
| options.defaultView | string | Texture | Container | Sprite | Graphics | Container-based view that is shown when non of the button events are active. Can be a string (name of texture) or an instance of Texture, Container, Sprite or Graphics. If you want to use NineSliceSprite, you have to pass a text (name of texture) or an instance of Texture as a parameter here. |  |
| options.hoverView | string | Texture | Container | Sprite | Graphics | Container-based view that is shown when the mouse hovers over the button. Can be a string (name of texture) or an instance of Texture, Container, Sprite or Graphics. If you want to use NineSliceSprite, you have to pass a text (name of texture) or an instance of Texture as a parameter here. |  |
| options.pressedView | string | Texture | Container | Sprite | Graphics | Container-based view, shown when the mouse press on the component. Can be a string (name of texture) or an instance of Texture, Container, Sprite or Graphics. If you want to use NineSliceSprite, you have to pass a text (name of texture) or an instance of Texture as a parameter here. |  |
| options.disabledView | string | Texture | Container | Sprite | Graphics | Container-based view shown when the button is disabled. Can be a string (name of texture) or an instance of Texture, Container, Sprite or Graphics. If you want to use NineSliceSprite, you have to pass a text (name of texture) or an instance of Texture as a parameter here. |  |
| options.icon | string | Texture | Container | Sprite | Graphics | Container-based view for the button icon. |  |
| options.text | Text | Text-based view for the button text. |  |
| options.padding | number | Padding of the button text and icon views. If button text or icon does not fit active view + padding it will scale down to fit. |  |
| options.offset | Point | Offset of the button state views. |  |
| options.textOffset | Point | Offset of the text view. |  |
| options.iconOffset | Point | Offset of the icon view. |  |
| options.scale | number | Scale of the button. Scale will be applied to a main container, when all animations scales will be applied to the inner view. |  |
| options.defaultTextScale | number | Base text scaling to take into account when fitting inside the button. |  |
| options.defaultIconScale | number | Base icon scaling to take into account when fitting inside the button. |  |
| options.defaultTextAnchor | number | Base text anchor to take into account when fitting and placing inside the button. |  |
| options.defaultIconAnchor | number | Base icon anchor to take into account when fitting and placing inside the button. |  |
| options.anchor | number | Anchor point of the button. |  |
| options.anchorX | number | Horizontal anchor point of the button. |  |
| options.anchorY | number | Vertical anchor point of the button. |  |
| options.nineSliceSprite | Array | NineSliceSprite values for views ([number, number, number, number]). !!! IMPORTANT: To make it work, you have to pass a views (defaultView, hoverView, pressedView, disabledView) parameters as texture name or texture instance. |  |
| options.animations | Animations that will be played when the button state changes. |  |  |

### Example

```ts
 const button = new FancyButton({
     defaultView: `button.png`,
     hoverView: `button_hover.png`,
     pressedView: `button_pressed.png`,
     text: 'Click me!',
     animations: {
          hover: {
              props: {
                  scale: {
                      x: 1.1,
                      y: 1.1,
                  }
              },
              duration: 100,
          },
          pressed: {
              props: {
                  scale: {
                      x: 0.9,
                      y: 0.9,
                  }
              },
              duration: 100,
          }
      }
 });

 button.onPress.connect(() => console.log('Button pressed!'));
```

### Extends

- ButtonContainer

### Members

#### _offset Offset & Pos

Offset of the button state views. If state views have different sizes, this option can help adjust them.

#### _padding number

Padding of the button text view. If button text does not fit active view + padding it will scale down to fit.

- Default Value:: 0

#### _textOffset Offset

Offset of the text view. Can be set to any state of the button.

#### anchor ObservablePoint

Anchor point of the button.

#### contentFittingMode

Sets the fitting mode for the button's content.

#### contentFittingMode ContentFittingMode

Returns the fitting mode for the button's content, defaulting to 'default'.

#### defaultIconAnchor

Sets the base anchor for the icon view to take into account when fitting and placing inside the button.

#### defaultIconAnchor Pos

Returns the icon view base anchor.

#### defaultIconScale

Sets the base scale for the icon view to take into account when fitting inside the button.

#### defaultIconScale Pos

Returns the icon view base scale.

#### defaultTextAnchor

Sets the base anchor for the text view to take into account when fitting and placing inside the button.

#### defaultTextAnchor Pos

Returns the text view base anchor.

#### defaultTextScale

Sets the base scale for the text view to take into account when fitting inside the button.

#### defaultTextScale Pos

Returns the text view base scale.

#### defaultView

Sets the default view of the button.

#### defaultView Container | undefined

Returns the default view of the button.

#### disabledView

Sets the disabled view of the button.

#### disabledView Container | undefined

Returns the disabled view of the button.

#### enabled boolean

Setter, that prevents all button events from firing.

#### height

Sets height of a FancyButtons state views. If nineSliceSprite is set, then height will be set to nineSliceSprites of a views. If nineSliceSprite is not set, then height will control components height as Container.

#### height number

Gets height of a FancyButton.

#### hoverView

Sets the hover view of the button.

#### hoverView Container | undefined

Returns the hover view of the button.

#### iconOffset Offset

Offset of the icon view. Can be set to any state of the button.

#### iconView

Sets the iconView of the button.

#### iconView Container | undefined

Returns the icon view of the button.

#### offset

Sets the button offset.

#### offset Offset

Returns the button offset.

#### padding

Sets the button padding.

#### padding number

Returns the button padding.

#### pressedView

Sets the pressed view of the button.

#### pressedView Container | undefined

Returns the pressed view of the button.

#### state State

State of the button. Possible valuers are: 'default', 'hover', 'pressed', 'disabled'

- Default Value:: "default"

#### text

Updates the text of the button and updates its scaling basing on the new size.

#### text string | undefined

Returns the text string of the button text element.

#### textOffset

Sets the button text offset.

#### textOffset Offset

Returns the button text offset.

#### textView

Sets the textView of the button.

#### textView PixiText | undefined

Returns the text view of the button.

#### width

Sets width of a FancyButtons state views. If nineSliceSprite is set, then width will be set to nineSliceSprites of a views. If nineSliceSprite is not set, then width will control components width as Container.

#### width number

Gets width of a FancyButton.

#### _defaultIconAnchor Pos protected

Base icon anchor to take into account when fitting and placing inside the button

#### _defaultIconScale Pos protected

Base icon scaling to take into account when fitting inside the button

#### _defaultTextAnchor Pos protected

Base text anchor to take into account when fitting and placing inside the button

#### _defaultTextScale Pos protected

Base text scaling to take into account when fitting inside the button

#### options ButtonOptions protectedreadonly

FancyButton options.

### Methods

#### removeView (viewType)

Removes button view by type

| Name | Type | Description |
| --- | --- | --- |
| viewType | 'defaultView' | 'hoverView' | 'pressedView' | 'disabledView' | type of the view to remove |

#### setState (newState, force)

Updates button state and shows the according views.

Updates positions and offsets of the views.

Plays animations if they are set.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| newState | State |  |  |
| force | boolean | false |  |

#### adjustIconView (state) protected

Adjusts icon view position and scale.

| Name | Type | Description |
| --- | --- | --- |
| state | State |  |

#### adjustTextView (state) protected

Adjusts text view position and scale.

| Name | Type | Description |
| --- | --- | --- |
| state | State |  |

#### createTextView (text) protected

Manage button text view.

| Name | Type | Description |
| --- | --- | --- |
| text | string | Text | can be a string, Text, BitmapText ot HTMLText (Container-based element). |

#### getStateView (state) Container | undefined protected

Returns active view for the state.

| Name | Type | Description |
| --- | --- | --- |
| state | State |  |

##### Returns:

| Type | Description |
| --- | --- |
| Container | undefined |  |

#### playAnimations (state) protected

Starts animation for the current button state if configured.

| Name | Type | Description |
| --- | --- | --- |
| state | State |  |

#### setOffset (view, state, offset) protected

Manages views offsets if it's set.

| Name | Type | Description |
| --- | --- | --- |
| view | Container |  |
| state | State |  |
| offset | Offset |  |

#### updateAnchor () protected

Reset views positions according to the button anchor setting. We have to set the anchor position for each view individually, as each of them can be a different type of view (container without anchor, sprite with anchor, etc) we have to reset all anchors to 0,0 and then set the positions manually.

#### updateView (viewType, view) protected

Helper method to update or cleanup button views.

| Name | Type | Description |
| --- | --- | --- |
| viewType | 'defaultView' | 'hoverView' | 'pressedView' | 'disabledView' | type of the view to update |
| view | string | Texture | Container | unknown | new view |
