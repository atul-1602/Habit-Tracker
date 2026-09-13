import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { forwardRef } from 'react';

export interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'bodySecondary' | 'caption';
}

export const Text = forwardRef<RNText, TextProps>(
  ({ className, variant = 'body', style, ...props }, ref) => {
    let variantStyles = '';

    switch (variant) {
      case 'h1':
        variantStyles = 'text-3xl font-bold text-text-primary';
        break;
      case 'h2':
        variantStyles = 'text-2xl font-semibold text-text-primary';
        break;
      case 'h3':
        variantStyles = 'text-xl font-medium text-text-primary';
        break;
      case 'body':
        variantStyles = 'text-base text-text-primary';
        break;
      case 'bodySecondary':
        variantStyles = 'text-sm text-text-secondary';
        break;
      case 'caption':
        variantStyles = 'text-xs text-text-muted';
        break;
    }

    return (
      <RNText
        ref={ref}
        className={`${variantStyles} ${className || ''}`}
        style={style}
        {...props}
      />
    );
  }
);

Text.displayName = 'Text';
