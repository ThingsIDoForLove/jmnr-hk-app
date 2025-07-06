# Splash Icon Change Guide

## Quick Start

### 1. Replace Existing Icon
```bash
# Replace the current splash icon
cp your-new-icon.png assets/images/splash-icon.png
```

### 2. Update Configuration (if using different filename)
Edit `app.json`:
```json
[
  "expo-splash-screen",
  {
    "image": "./assets/images/your-new-icon.png",
    "imageWidth": 200,
    "resizeMode": "contain",
    "backgroundColor": "#ffffff"
  }
]
```

### 3. Test Changes
```bash
# Restart development server
npm run android

# Force close app and reopen to see splash screen
```

## Icon Requirements

### Size & Format
- **Minimum width**: 200px
- **Format**: PNG (recommended) or JPG
- **File size**: Under 1MB
- **Aspect ratio**: Any (will be scaled proportionally)

### Design Guidelines
- **Simple design**: Avoid complex details
- **Centered content**: Logo should be centered
- **High contrast**: Works on light/dark backgrounds
- **Transparent background**: PNG with transparency works best

## Configuration Options

### Image Width
```json
"imageWidth": 200  // Adjust size as needed
```

### Resize Mode
```json
"resizeMode": "contain"  // Options: "contain", "cover", "stretch"
```

### Background Color
```json
"backgroundColor": "#ffffff"  // Any hex color
```

## Testing Methods

### Development Testing
1. **Reload**: Press 'r' in terminal or shake device
2. **Force close**: Close app completely and reopen
3. **Clear cache**: Clear app cache and restart

### Production Testing
1. **Build**: `eas build --platform android`
2. **Install**: Install new APK/AAB
3. **Test**: Open app to see splash screen

## Troubleshooting

### Common Issues
- **Icon not showing**: Check file path in app.json
- **Wrong size**: Adjust imageWidth value
- **Poor quality**: Use higher resolution image
- **Wrong colors**: Update backgroundColor

### Debug Steps
1. Verify file exists: `ls assets/images/`
2. Check file size: Should be reasonable (< 1MB)
3. Validate JSON: Ensure app.json is valid
4. Clear cache: Clear app cache and restart

## Examples

### Basic Configuration
```json
[
  "expo-splash-screen",
  {
    "image": "./assets/images/splash-icon.png",
    "imageWidth": 200,
    "resizeMode": "contain",
    "backgroundColor": "#ffffff"
  }
]
```

### Dark Theme Splash
```json
[
  "expo-splash-screen",
  {
    "image": "./assets/images/splash-icon.png",
    "imageWidth": 200,
    "resizeMode": "contain",
    "backgroundColor": "#000000"
  }
]
```

### Large Icon
```json
[
  "expo-splash-screen",
  {
    "image": "./assets/images/splash-icon.png",
    "imageWidth": 300,
    "resizeMode": "contain",
    "backgroundColor": "#ffffff"
  }
]
```

## Best Practices

1. **Test on multiple devices**: Different screen sizes
2. **Use transparent PNGs**: Better integration
3. **Keep file size small**: Faster loading
4. **Design for both themes**: Light and dark backgrounds
5. **Simple is better**: Avoid complex designs

## File Structure
```
assets/
  images/
    splash-icon.png          # Current splash icon
    splash-icon-dark.png     # Dark theme variant
    splash-icon-light.png    # Light theme variant
    your-new-splash.png      # Your new splash icon
``` 