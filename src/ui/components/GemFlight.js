import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import Icon from './Icon';

const SIZE = 34;
const FLIGHT_MS = 620;
const STAGGER_MS = 90;

function Flight({ flight, order, onArrive, theme, reduceMotion }) {
  const p = useSharedValue(0);
  const dx = flight.to.x - flight.from.x;
  const dy = flight.to.y - flight.from.y;
  const arc = Math.min(120, 40 + Math.abs(dy) * 0.25);

  useEffect(() => {
    const done = (finished) => {
      if (finished) runOnJS(onArrive)(flight.id);
    };
    p.value = withDelay(
      120 + order * STAGGER_MS,
      withTiming(
        1,
        {
          duration: reduceMotion ? 200 : FLIGHT_MS,
          easing: Easing.inOut(Easing.cubic),
        },
        done
      )
    );
  }, [flight.id, order, reduceMotion, onArrive, p]);

  const style = useAnimatedStyle(() => {
    const t = p.value;
    if (reduceMotion) return { opacity: 1 - t };
    const scale = t < 0.25 ? 1 + t * 2.4 : 1.6 - ((t - 0.25) / 0.75) * 1.05;
    return {
      opacity: t > 0.92 ? (1 - t) / 0.08 : 1,
      transform: [
        { translateX: dx * t },
        { translateY: dy * t - arc * Math.sin(Math.PI * t) },
        { rotate: `${t * 360}deg` },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.gem,
        {
          left: flight.from.x - SIZE / 2,
          top: flight.from.y - SIZE / 2,
          backgroundColor: theme.surface,
          borderColor: theme.star,
        },
        style,
      ]}
    >
      <Icon name="gem" size={20} color={theme.star} strokeWidth={2.5} />
    </Animated.View>
  );
}

/**
 * Collected gems arc from their board cell into the gems goal chip.
 * Coordinates are relative to the parent the overlay fills.
 *
 * @param {Object} props
 * @param {Array<{ id: string, from: {x:number,y:number}, to: {x:number,y:number} }>} props.flights
 * @param {(id: string) => void} props.onArrive
 * @param {Object} props.theme
 * @param {boolean} [props.reduceMotion]
 */
export default function GemFlight({ flights, onArrive, theme, reduceMotion }) {
  if (!flights || flights.length === 0) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {flights.map((f) => (
        <Flight
          key={f.id}
          flight={f}
          order={f.order ?? 0}
          onArrive={onArrive}
          theme={theme}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gem: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
