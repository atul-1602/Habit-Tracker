import { TouchableOpacity, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { forwardRef } from 'react';
import { Text } from './Text';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  title: string;
}

export const Button = forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, title, disabled, ...props }, ref) => {
    
    let baseStyles = 'flex-row items-center justify-center rounded-full ';
    let textStyles = 'font-semibold ';
    
    // Variant styling
    switch (variant) {
      case 'primary':
        baseStyles += 'bg-accent-lime ';
        textStyles += 'text-background ';
        break;
      case 'secondary':
        baseStyles += 'bg-surface-elevated ';
        textStyles += 'text-text-primary ';
        break;
      case 'outline':
        baseStyles += 'border border-text-secondary bg-transparent ';
        textStyles += 'text-text-primary ';
        break;
      case 'ghost':
        baseStyles += 'bg-transparent ';
        textStyles += 'text-accent-lime ';
        break;
    }

    // Size styling
    switch (size) {
      case 'sm':
        baseStyles += 'px-4 py-2 ';
        textStyles += 'text-sm ';
        break;
      case 'md':
        baseStyles += 'px-6 py-3 ';
        textStyles += 'text-base ';
        break;
      case 'lg':
        baseStyles += 'px-8 py-4 ';
        textStyles += 'text-lg ';
        break;
    }

    const opacity = disabled || isLoading ? 'opacity-50' : 'opacity-100';

    return (
      <TouchableOpacity
        ref={ref}
        className={`${baseStyles} ${opacity} ${className || ''}`}
        disabled={disabled || isLoading}
        activeOpacity={0.7}
        {...props}
      >
        {isLoading ? (
          <ActivityIndicator color={variant === 'primary' ? '#111111' : '#FFFFFF'} />
        ) : (
          <Text className={textStyles}>{title}</Text>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';
