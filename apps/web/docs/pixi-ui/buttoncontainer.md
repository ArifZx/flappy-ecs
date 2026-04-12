# ButtonContainer
Source: https://pixijs.io/ui/ButtonContainer.html
### Example

```ts
 const button = new ButtonContainer(
      new Graphics()
          .fill(0xFFFFFF)
          .roundRect(0, 0, 100, 50, 15)
 );

 button.onPress.connect(() => console.log('onPress'));

 container.addChild(button);
```

### Extends

- Container
