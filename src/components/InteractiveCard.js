import React, { useRef } from "react";
import { Animated, Pressable, View } from "react-native";

const InteractiveCard = ({
  children,
  onPress,
  className,
  scaleTo = 0.96,
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  disabled = false,
  testID,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      friction: 6,
      tension: 150,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 150,
    }).start();
  };

  return (
    <View className={className}>
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole || (onPress ? "button" : undefined)}
        accessibilityState={accessibilityState || (disabled ? { disabled: true } : undefined)}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        delayPressIn={0}
        style={({ pressed }) => [{ opacity: disabled ? 0.65 : pressed ? 0.9 : 1 }]}
        testID={testID}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          {children}
        </Animated.View>
      </Pressable>
    </View>
  );
};

export default InteractiveCard;
