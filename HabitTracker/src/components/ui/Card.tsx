import { View, ViewProps } from 'react-native';
import { forwardRef } from 'react';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card = forwardRef<View, CardProps>(
  ({ className, variant = 'default', style, children, ...props }, ref) => {
    let variantStyles = 'rounded-2xl p-4 ';

    switch (variant) {
      case 'default':
        variantStyles += 'bg-surface ';
        break;
      case 'elevated':
        variantStyles += 'bg-surface-elevated shadow-sm ';
        break;
      case 'outlined':
        variantStyles += 'bg-transparent border border-surface-elevated ';
        break;
    }

    return (
      <View
        ref={ref}
        className={`${variantStyles} ${className || ''}`}
        style={style}
        {...props}
      >
        {children}
      </View>
    );
  }
);

Card.displayName = 'Card';
