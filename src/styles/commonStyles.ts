import { StyleSheet, Platform } from 'react-native';
import { getThemeWithPalette } from './theme';

/**
 * Generate common component styles based on the current theme
 * Inspired by Expo Go's clean and modern UI design
 */
export const getCommonStyles = (theme: 'light' | 'dark', palette: string = 'default') => {
  const colors = getThemeWithPalette(theme, palette as any);

  return StyleSheet.create({
    // Card styling with subtle elevation in light mode, borders in dark mode
    card: {
      backgroundColor: colors.CARD,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 8,
      borderWidth: theme === 'dark' ? 0.5 : 0,
      borderColor: colors.BORDER,
      // Different shadow styles for light/dark
      ...Platform.select({
        ios: {
          shadowColor: theme === 'dark' ? '#000000' : 'rgba(0,0,0,0.5)',
          shadowOffset: { width: 0, height: theme === 'dark' ? 4 : 2 },
          shadowOpacity: theme === 'dark' ? 0.25 : 0.08,
          shadowRadius: theme === 'dark' ? 8 : 4,
        },
        android: {
          elevation: theme === 'dark' ? 0 : 3, // Flat in dark mode, elevated in light
        },
      }),
    },
    
    // Smaller card with less padding
    compactCard: {
      backgroundColor: colors.CARD,
      borderRadius: 12,
      padding: 12,
      marginHorizontal: 12,
      marginVertical: 6,
      borderWidth: theme === 'dark' ? 0.5 : 0,
      borderColor: colors.BORDER,
      ...Platform.select({
        ios: {
          shadowColor: theme === 'dark' ? '#000000' : 'rgba(0,0,0,0.5)',
          shadowOffset: { width: 0, height: theme === 'dark' ? 3 : 1 },
          shadowOpacity: theme === 'dark' ? 0.25 : 0.05,
          shadowRadius: theme === 'dark' ? 6 : 3,
        },
        android: {
          elevation: theme === 'dark' ? 0 : 2,
        },
      }),
    },
    
    // Input field with inset appearance
    inputField: {
      backgroundColor: theme === 'dark' ? colors.SURFACE_VARIANT : colors.SURFACE,
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
      borderWidth: theme === 'dark' ? 0 : 1,
      borderColor: theme === 'dark' ? 'transparent' : 'rgba(0, 0, 0, 0.05)',
      color: colors.TEXT.PRIMARY,
      // Inset effect differs between light/dark
      ...Platform.select({
        ios: {
          shadowColor: theme === 'dark' ? '#000000' : 'rgba(0,0,0,0.2)',
          shadowOffset: { width: 0, height: theme === 'dark' ? 1 : 0 },
          shadowOpacity: theme === 'dark' ? 0.5 : 0.03,
          shadowRadius: theme === 'dark' ? 2 : 1,
        },
        android: {
          elevation: 0, // No elevation for inset appearance
        },
      }),
    },
    
    // Text input in dark mode
    darkModeInput: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'transparent',
      color: colors.TEXT.PRIMARY,
      borderRadius: 12,
    },
    
    // Text input in light mode
    lightModeInput: {
      backgroundColor: colors.SURFACE,
      borderColor: 'rgba(0, 0, 0, 0.05)',
      color: colors.TEXT.PRIMARY,
      borderRadius: 12,
    },
    
    // Button styling
    button: {
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      justifyContent: 'center',
      alignItems: 'center',
      // Shadow for light mode buttons
      ...Platform.select({
        ios: {
          shadowColor: theme === 'dark' ? 'transparent' : 'rgba(0,0,0,0.5)',
          shadowOffset: { width: 0, height: theme === 'dark' ? 0 : 2 },
          shadowOpacity: theme === 'dark' ? 0 : 0.1,
          shadowRadius: theme === 'dark' ? 0 : 3,
        },
        android: {
          elevation: theme === 'dark' ? 0 : 2,
        },
      }),
    },
    
    // Primary button
    primaryButton: {
      backgroundColor: theme === 'light' 
        ? getThemeWithPalette(theme, palette as any).TAB_BAR.ACTIVE
        : getThemeWithPalette(theme, palette as any).TAB_BAR.ACTIVE,
    },
    
    // Secondary button (outline)
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme === 'light' 
        ? getThemeWithPalette(theme, palette as any).TAB_BAR.ACTIVE
        : getThemeWithPalette(theme, palette as any).TAB_BAR.ACTIVE,
    },
    
    // List separator
    separator: {
      height: 1,
      backgroundColor: theme === 'dark' ? colors.BORDER : 'rgba(0, 0, 0, 0.05)',
      marginVertical: 8,
    },
    
    // Inset group styling (like in settings)
    insetGroup: {
      backgroundColor: colors.CARD,
      borderRadius: 16,
      overflow: 'hidden',
      marginHorizontal: 16,
      marginVertical: 12,
      borderWidth: theme === 'dark' ? 0.5 : 0,
      borderColor: colors.BORDER,
      // Different shadow for light mode
      ...Platform.select({
        ios: {
          shadowColor: theme === 'dark' ? 'transparent' : 'rgba(0,0,0,0.5)',
          shadowOffset: { width: 0, height: theme === 'dark' ? 0 : 2 },
          shadowOpacity: theme === 'dark' ? 0 : 0.07,
          shadowRadius: theme === 'dark' ? 0 : 3,
        },
        android: {
          elevation: theme === 'dark' ? 0 : 2,
        },
      }),
    },
    
    // Row in inset group
    insetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme === 'dark' ? colors.BORDER : 'rgba(0, 0, 0, 0.04)',
    },
    
    // Last row in inset group (no border)
    insetRowLast: {
      borderBottomWidth: 0,
    },
    
    // Typography
    heading: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.TEXT.PRIMARY,
      marginBottom: 8,
    },
    
    subheading: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.TEXT.PRIMARY,
      marginBottom: 8,
    },
    
    body: {
      fontSize: 16,
      color: colors.TEXT.SECONDARY,
      lineHeight: 22,
    },
    
    caption: {
      fontSize: 14,
      color: colors.TEXT.TERTIARY,
    },
  });
}; 