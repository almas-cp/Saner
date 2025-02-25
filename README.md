# Expo Router Example

Use [`expo-router`](https://docs.expo.dev/router/introduction/) to build native navigation using files in the `app/` directory.

## 🚀 How to use

```sh
npx create-expo-app -e with-router
```

## 📝 Notes

- [Expo Router: Docs](https://docs.expo.dev/router/introduction/)

# Saner App

## Custom UI Elements

### App Bar with Custom Font

The app now displays "Saner" in the top left of the app bar with a custom Montserrat Bold font. This implementation:

- Uses `useFonts` from expo-font to load the custom font
- Configures app.json to include the custom font asset
- Applies elegant styling with appropriate text shadow effects for both light and dark themes
- Uses the app's primary color (TAB_BAR.ACTIVE) for the title

### Font Structure

Custom fonts are stored in:
```
/assets
  /fonts
    Montserrat-Bold.ttf
```

### Font Implementation

The font is implemented in the main layout file `app/(main)/_layout.tsx` using:

```tsx
// Load custom fonts
const [fontsLoaded] = useFonts({
  'Saner-Bold': require('../../assets/fonts/Montserrat-Bold.ttf'),
});

// And used in the header title
headerTitle: () => (
  <Text 
    style={{ 
      fontFamily: fontsLoaded ? 'Saner-Bold' : undefined,
      fontSize: 24, 
      fontWeight: 'bold',
      color: colors.TAB_BAR.ACTIVE,
      // Additional styling...
    }}
  >
    Saner
  </Text>
)
```

## Usage

The app name will display in the top left of all main app screens, providing consistent branding throughout the application.
