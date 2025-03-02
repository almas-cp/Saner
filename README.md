# Expo Router Example

Use [`expo-router`](https://docs.expo.dev/router/introduction/) to build native navigation using files in the `app/` directory.

## 🚀 How to use

```sh
npx create-expo-app -e with-router
```

## 📝 Notes

- [Expo Router: Docs](https://docs.expo.dev/router/introduction/)

# Saner

A mental health and wellness application built with React Native and Expo.

## Styling and Theming

### Expo Go-Inspired Dark Theme

The app features a beautiful dark theme inspired by Expo Go's clean and minimal design:

- **True black backgrounds**: Uses true black (#000000) for the main background in dark mode for OLED displays.
- **Depth hierarchy**: Implements a subtle hierarchy of background colors with different shades of dark for various UI components.
- **Vibrant accent colors**: Enhanced color palette with more vibrant accent colors in dark mode for better visibility and aesthetics.
- **Inset appearance**: Special styling for input fields to achieve an inset appearance, making them visually distinct.
- **Subtle borders**: Uses fine hairline borders (0.5px) instead of shadows in dark mode for a clean look.

### Component Styling

The app includes a comprehensive collection of styled components:

- **Cards**: Modern card designs with appropriate elevation in light mode and subtle borders in dark mode.
- **Input fields**: Input fields with inset appearance and proper contrast against backgrounds.
- **Buttons**: Consistent button styling with proper padding and border radius.
- **Breathing exercise**: Interactive breathing exercise screen with smooth animations and theme-aware colors.

### Custom Font

The app uses Montserrat-Bold as a custom font for the app title "Saner" in the navigation header.

## App Sections

### Breath Page

The breathing exercise page helps users practice different breathing techniques:

- Visually engaging breathing circle that expands and contracts with animations
- Multiple breathing patterns including Box Breathing and 4-7-8 Breathing
- Mood tracking functionality with interactive emoji slider
- Statistics display showing user's breathing practice history

### Profile Page

User profiles include:

- User information display
- Clickable post cards that navigate to post details

### Discover Page

The discover page allows users to explore posts:

- Clean post cards with titles and author information
- Navigation to post details when tapping on cards

## Theme Customization

Users can customize the app's appearance with:

- Light/dark mode toggle
- Multiple color palettes: Default (Purple), Ocean, Mint, Berry, and Citric

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

## Database Management

### Supabase Database Client Tool

A Python-based CLI tool for interacting with the Supabase database without the complexity of the MCP server.

#### Features

- Connect to the Supabase PostgreSQL database directly
- Test database connections
- List all tables in the database
- View table schemas
- Count rows in tables
- Execute SQL queries with parametrized inputs
- Output results in different formats (JSON, CSV, formatted tables)
- Save query results to files

#### Usage

```bash
# Test database connection
python db.py --test

# List all tables in the database
python db.py --list-tables

# Show schema for a specific table
python db.py --schema profiles

# Count rows in a table
python db.py --count posts

# Execute a simple SQL query
python db.py "SELECT * FROM profiles LIMIT 5"

# Execute a query with JSON output
python db.py "SELECT * FROM profiles LIMIT 5" --output json

# Save query results to a file
python db.py "SELECT * FROM profiles" --output csv --file profiles.csv

# Execute a query from a file
python db.py --query-file my_query.sql

# Use verbose mode for more detailed output
python db.py --test --verbose
```

#### Requirements

- Python 3.7+
- psycopg2 (PostgreSQL adapter for Python)

Install the required packages with:

```bash
pip install psycopg2-binary
```

## Usage

The app name will display in the top left of all main app screens, providing consistent branding throughout the application.
