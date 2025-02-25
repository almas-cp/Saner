import { Platform } from 'react-native';

export const COLORS = {
  BRAND: {
    PRIMARY: '#6B4DE6',    // Main purple
    SECONDARY: '#9B7EFF',  // Light purple
  },
  GRADIENT: {
    MOOD: ['#FF6B6B', '#FFB347', '#4AD66D'], // Mood slider gradient
  },
  PALETTES: {
    DEFAULT: {
      PRIMARY: '#6B4DE6',    // Main purple
      SECONDARY: '#9B7EFF',  // Light purple
      ACCENT: '#4AD66D',     // Green
    },
    CITRIC: {
      PRIMARY: '#FFB347',    // Orange
      SECONDARY: '#FFCC80',  // Light orange
      ACCENT: '#FF6B6B',     // Red
    },
    MINT: {
      PRIMARY: '#4AD66D',    // Green
      SECONDARY: '#A5F2B3',  // Light green
      ACCENT: '#2E86DE',     // Blue
    },
    BERRY: {
      PRIMARY: '#FF6B6B',    // Red
      SECONDARY: '#FFA5A5',  // Light red
      ACCENT: '#9B7EFF',     // Purple
    },
    OCEAN: {
      PRIMARY: '#2E86DE',    // Blue
      SECONDARY: '#90CAF9',  // Light blue
      ACCENT: '#4AD66D',     // Green
    }
  },
  LIGHT: {
    BACKGROUND: '#f1f6f9',       // Light blue-gray background (was '#FFFFFF')
    SURFACE: '#F8F9FA',          // Very light gray for surfaces
    SURFACE_VARIANT: '#F1F3F5',  // Slightly darker for modals and cards
    CARD: '#FFFFFF',             // Pure white for cards with shadows
    TEXT: {
      PRIMARY: '#000000',        // True black for primary text
      SECONDARY: '#404040',      // Dark gray for secondary text
      TERTIARY: '#737373',       // Medium gray for tertiary/disabled text
    },
    BORDER: 'rgba(0, 0, 0, 0.08)',  // Slightly more visible borders
    TAB_BAR: {
      ACTIVE: '#6B4DE6',          // Vibrant purple for active state
      INACTIVE: '#8A8A8A',        // Darker gray for inactive state
      BACKGROUND: '#f1f6f9',      // Updated to match main background
    },
    ICONS: {
      PRIMARY: '#6B4DE6',         // Primary brand color for icons
      SECONDARY: '#737373',       // Gray for secondary icons
    }
  },
  DARK: {
    BACKGROUND: '#000000',      // True black (Expo Go style)
    SURFACE: '#121212',         // Second level (cards, menus)
    SURFACE_VARIANT: '#1E1E1E', // Third level (elevated elements)
    CARD: '#121212',            // Card background
    TEXT: {
      PRIMARY: '#FFFFFF',
      SECONDARY: 'rgba(255, 255, 255, 0.7)',
      TERTIARY: 'rgba(255, 255, 255, 0.45)',
    },
    BORDER: 'rgba(255, 255, 255, 0.1)',
    TAB_BAR: {
      ACTIVE: '#9B7EFF',     // Light purple
      INACTIVE: 'rgba(255, 255, 255, 0.5)',
      BACKGROUND: '#000000', // True black
    },
    ICONS: {
      PRIMARY: '#9B7EFF',    // Light purple
      SECONDARY: 'rgba(255, 255, 255, 0.5)',
    }
  },
} as const;

export type Theme = 'light' | 'dark';
export type ColorPalette = 'default' | 'citric' | 'mint' | 'berry' | 'ocean';

// Function to get palette colors
export const getPaletteColors = (palette: ColorPalette) => {
  switch (palette) {
    case 'citric':
      return COLORS.PALETTES.CITRIC;
    case 'mint':
      return COLORS.PALETTES.MINT;
    case 'berry':
      return COLORS.PALETTES.BERRY;
    case 'ocean':
      return COLORS.PALETTES.OCEAN;
    default:
      return COLORS.PALETTES.DEFAULT;
  }
};

// Get theme colors with palette applied
export const getThemeWithPalette = (theme: Theme, palette: ColorPalette) => {
  const baseColors = theme === 'light' ? { ...COLORS.LIGHT } : { ...COLORS.DARK };
  const paletteColors = getPaletteColors(palette);
  
  // Apply palette colors to the theme
  return {
    ...baseColors,
    TAB_BAR: {
      ...baseColors.TAB_BAR,
      ACTIVE: theme === 'light' 
        ? paletteColors.PRIMARY 
        : palette === 'default' ? '#8A6BFF' : // More vibrant in dark mode
          palette === 'citric' ? '#FFBE59' :
          palette === 'mint' ? '#5AFFA0' :
          palette === 'berry' ? '#FF7D7D' :
          '#49A1FF', // ocean
    },
    ICONS: {
      ...baseColors.ICONS,
      PRIMARY: theme === 'light' 
        ? paletteColors.PRIMARY 
        : palette === 'default' ? '#8A6BFF' : // More vibrant in dark mode
          palette === 'citric' ? '#FFBE59' :
          palette === 'mint' ? '#5AFFA0' :
          palette === 'berry' ? '#FF7D7D' :
          '#49A1FF', // ocean
    }
  };
};

export const getNavigationTheme = (theme: Theme) => {
  const colors = theme === 'light' ? COLORS.LIGHT : COLORS.DARK;
  
  return {
    tabBar: {
      activeTintColor: colors.TAB_BAR.ACTIVE,
      inactiveTintColor: colors.TAB_BAR.INACTIVE,
      style: {
        height: Platform.OS === 'ios' ? 88 : 68,
        paddingBottom: Platform.OS === 'ios' ? 30 : 10,
        paddingTop: 10,
        backgroundColor: colors.TAB_BAR.BACKGROUND,
        borderTopWidth: theme === 'dark' ? 0.5 : 1,
        borderTopColor: colors.BORDER,
        elevation: theme === 'light' ? 8 : 0,
        shadowColor: theme === 'light' ? '#000000' : 'transparent',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      labelStyle: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
      },
      iconStyle: {
        marginTop: 4,
      },
    },
    header: {
      style: {
        backgroundColor: colors.BACKGROUND,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: theme === 'dark' ? 0.5 : 1,
        borderBottomColor: colors.BORDER,
      },
      titleStyle: {
        fontWeight: '700',
        fontSize: 20,
        color: colors.TEXT.PRIMARY,
      },
    },
    screenOptions: {
      tabBarStyle: {
        height: Platform.OS === 'ios' ? 88 : 68,
        paddingBottom: Platform.OS === 'ios' ? 30 : 10,
        paddingTop: 10,
        backgroundColor: colors.TAB_BAR.BACKGROUND,
        borderTopWidth: theme === 'dark' ? 0.5 : 1,
        borderTopColor: colors.BORDER,
        elevation: theme === 'light' ? 8 : 0,
        shadowColor: theme === 'light' ? '#000000' : 'transparent',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      tabBarActiveTintColor: colors.TAB_BAR.ACTIVE,
      tabBarInactiveTintColor: colors.TAB_BAR.INACTIVE,
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
      },
      headerStyle: {
        backgroundColor: colors.BACKGROUND,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: theme === 'dark' ? 0.5 : 1,
        borderBottomColor: colors.BORDER,
      },
      headerTitleStyle: {
        color: colors.TEXT.PRIMARY,
        fontWeight: '700',
        fontSize: 20,
      },
    },
    cardStyle: {
      backgroundColor: colors.CARD,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 8,
      borderWidth: theme === 'dark' ? 0.5 : 0,
      borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : undefined,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: theme === 'dark' ? 4 : 2,
      },
      shadowOpacity: theme === 'dark' ? 0.4 : 0.1,
      shadowRadius: theme === 'dark' ? 8 : 4,
      elevation: theme === 'dark' ? 0 : 4, // Flat appearance in dark mode
    }
  } as const;
}; 