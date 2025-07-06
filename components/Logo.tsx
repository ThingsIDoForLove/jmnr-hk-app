import React from 'react';
import { Image, ImageStyle, StyleSheet, View, ViewStyle } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  source?: any;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'repeat' | 'center';
}

export function Logo({ 
  size = 'medium', 
  source, 
  style, 
  containerStyle,
  resizeMode = 'contain' 
}: LogoProps) {
  const logoSource = source || require('../assets/images/icon.png');
  
  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={logoSource}
        style={[styles.logo, styles[size], style]}
        resizeMode={resizeMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    // Default styles
  },
  small: {
    width: 32,
    height: 32,
  },
  medium: {
    width: 64,
    height: 64,
  },
  large: {
    width: 120,
    height: 120,
  },
  xlarge: {
    width: 200,
    height: 200,
  },
}); 