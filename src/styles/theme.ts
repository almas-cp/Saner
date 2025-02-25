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
    BACKGROUND: '#FFFFFF',
    SURFACE: '#F8F9FA',
    CARD: '#FFFFFF',
    TEXT: {
      PRIMARY: '#1A1A2E',    // Dark navy
      SECONDARY: '#16213E',  // Medium navy
      TERTIARY: '#0F3460',   // Light navy
    },
    BORDER: 'rgba(0, 0, 0, 0.06)',
    TAB_BAR: {
      ACTIVE: '#6B4DE6',
      INACTIVE: '#9E9E9E',
      BACKGROUND: '#FFFFFF',
    },
    ICONS: {
      PRIMARY: '#6B4DE6',
      SECONDARY: '#9E9E9E',
    }
  },
  DARK: {
    BACKGROUND: '#1A1A2E',   // Dark navy
    SURFACE: '#16213E',      // Medium navy
    CARD: '#0F3460',         // Light navy
    TEXT: {
      PRIMARY: '#FFFFFF',
      SECONDARY: '#E9E9E9',
      TERTIARY: '#B3B3B3',
    },
    BORDER: 'rgba(255, 255, 255, 0.08)',
    TAB_BAR: {
      ACTIVE: '#9B7EFF',     // Light purple
      INACTIVE: '#B3B3B3',
      BACKGROUND: '#1A1A2E', // Dark navy
    },
    ICONS: {
      PRIMARY: '#9B7EFF',    // Light purple
      SECONDARY: '#B3B3B3',
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
      ACTIVE: theme === 'light' ? paletteColors.PRIMARY : paletteColors.SECONDARY,
    },
    ICONS: {
      ...baseColors.ICONS,
      PRIMARY: theme === 'light' ? paletteColors.PRIMARY : paletteColors.SECONDARY,
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
        borderTopWidth: 1,
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
        borderBottomWidth: 1,
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
        borderTopWidth: 1,
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
        borderBottomWidth: 1,
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
      shadowColor: theme === 'light' ? '#000000' : '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: theme === 'light' ? 0.1 : 0.2,
      shadowRadius: 4,
      elevation: theme === 'light' ? 4 : 8,
    }
  } as const;
}; 