## The `haxball` Theme

`theme: 'haxball'` replicates HaxBall's native `.dialog` style using values
extracted directly from the live DOM (background, border-radius, header
accent line, font, button colors) — so a HaxUI window can look
indistinguishable from one of HaxBall's own dialogs:

```js
HaxUI.createWindow({
  id: 'confirm',
  title: 'Leave room?',
  theme: 'haxball',
  width: 300,
  height: 150,
  x: 100,
  y: 100,
  content: '<p>Are you sure you want to leave the room?</p><button>Leave</button>'
});
```
