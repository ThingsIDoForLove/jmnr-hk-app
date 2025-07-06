# Logo Guide for Hisaab-e-Khair App

This guide explains how to add and manage logos in your React Native Expo app.

## Current Logo Setup

### 1. App Icons (Already Configured)
Your app already has the following logos configured in `app.json`:

- **App Icon**: `./assets/images/icon.png` (1024x1024px recommended)
- **Android Adaptive Icon**: `./assets/images/adaptive-icon.png` (foreground image)
- **Splash Screen**: `./assets/images/splash-icon.png` (200px width, contained)
- **Web Favicon**: `./assets/images/favicon.png`

### 2. Logo Component
A reusable `Logo` component has been created at `components/Logo.tsx` with the following features:

- **Sizes**: `small` (32x32), `medium` (64x64), `large` (120x120), `xlarge` (200x200)
- **Custom source**: Can use any image file
- **Styling**: Custom styles and container styles
- **Resize modes**: `contain`, `cover`, `stretch`, `repeat`, `center`

## How to Use the Logo Component

### Basic Usage
```tsx
import { Logo } from '@/components/Logo';

// Default logo (uses icon.png)
<Logo />

// Custom size
<Logo size="large" />

// Custom image source
<Logo source={require('../assets/images/my-logo.png')} />

// Custom styling
<Logo 
  size="medium" 
  style={{ borderRadius: 8 }}
  containerStyle={{ marginBottom: 16 }}
/>
```

### Current Logo Placements

1. **Main Screen Header**: Medium-sized logo next to the app title
2. **Login Screen**: Large logo at the top of the activation screen
3. **Settings Screen**: Small logo in the header next to "ترتیبات"

## Adding Your Own Logos

### 1. Replace Existing Logos
To replace the current logos:

1. **App Icon**: Replace `assets/images/icon.png` with your 1024x1024px icon
2. **Android Icon**: Replace `assets/images/adaptive-icon.png` with your foreground image
3. **Splash Icon**: Replace `assets/images/splash-icon.png` with your splash screen logo
4. **Favicon**: Replace `assets/images/favicon.png` with your web favicon

### 2. Add New Logo Files
To add additional logos:

1. Place your logo files in `assets/images/`
2. Use them in the Logo component:
   ```tsx
   <Logo source={require('../assets/images/your-logo.png')} />
   ```

### 3. Logo Requirements

#### App Icon (`icon.png`)
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Design**: Simple, recognizable, works at small sizes

#### Android Adaptive Icon (`adaptive-icon.png`)
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Design**: Foreground image that works with background colors

#### Splash Icon (`splash-icon.png`)
- **Size**: 200px width (height auto)
- **Format**: PNG
- **Design**: Centered, works with light/dark backgrounds

## Logo Best Practices

### 1. Design Guidelines
- **Simplicity**: Keep logos simple and recognizable at small sizes
- **Consistency**: Use consistent styling across all logo instances
- **Transparency**: Use PNG format with transparency for better integration
- **Scalability**: Ensure logos look good at all sizes

### 2. File Organization
```
assets/
  images/
    icon.png              # Main app icon
    adaptive-icon.png     # Android adaptive icon
    splash-icon.png       # Splash screen logo
    favicon.png          # Web favicon
    logo-primary.png     # Primary logo for app content
    logo-secondary.png   # Secondary logo variant
    logo-dark.png        # Dark theme variant
    logo-light.png       # Light theme variant
```

### 3. Performance Considerations
- **File sizes**: Keep logo files under 100KB when possible
- **Caching**: Expo automatically caches images
- **Loading**: Use appropriate sizes for different contexts

## Adding Logos to New Screens

### 1. Import the Logo Component
```tsx
import { Logo } from '@/components/Logo';
```

### 2. Add to Your Component
```tsx
// In header
<View style={styles.header}>
  <Logo size="medium" style={styles.headerLogo} />
  <Text style={styles.title}>Screen Title</Text>
</View>

// As standalone element
<Logo size="large" style={{ marginBottom: 20 }} />

// In a button or card
<TouchableOpacity style={styles.card}>
  <Logo size="small" />
  <Text>Card Content</Text>
</TouchableOpacity>
```

### 3. Style Integration
```tsx
const styles = StyleSheet.create({
  headerLogo: {
    marginRight: 12,
    borderRadius: 8,
  },
  // ... other styles
});
```

## Troubleshooting

### Common Issues

1. **Logo not showing**: Check file path and require statement
2. **Wrong size**: Verify the size prop matches your needs
3. **Poor quality**: Ensure source image is high resolution
4. **Layout issues**: Check container styles and flex properties

### Debug Tips

1. **Check file exists**: Verify the image file is in the correct location
2. **Test with different sizes**: Try different size props
3. **Check console errors**: Look for image loading errors
4. **Test on different devices**: Ensure logos work on various screen sizes

## Next Steps

1. **Replace placeholder logos**: Add your actual logo files
2. **Test on all platforms**: Verify logos work on iOS, Android, and web
3. **Optimize file sizes**: Compress images if needed
4. **Add logo variants**: Consider dark/light theme versions
5. **Update splash screen**: Customize the splash screen with your branding

## Resources

- [Expo Image Documentation](https://docs.expo.dev/versions/latest/sdk/image/)
- [React Native Image Component](https://reactnative.dev/docs/image)
- [App Icon Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Android Adaptive Icons](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive) 