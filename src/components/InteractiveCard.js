import React, { useRef } from "react";
import { Animated, Pressable, View } from "react-native";

const InteractiveCard = ({ children, onPress, className, scaleTo = 0.96 }) => {
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
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        delayPressIn={0}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          {children}
        </Animated.View>
      </Pressable>
    </View>
  );
};

export default InteractiveCard;
