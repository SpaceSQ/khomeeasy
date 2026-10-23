import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const GLYPHS = [
  { id: 'lamp', source: require('../assets/splash/glyphs/lamp.png') },
  { id: 'dimmer', source: require('../assets/splash/glyphs/dimmer.png') },
  { id: 'rocker', source: require('../assets/splash/glyphs/rocker.png') },
  { id: 'blind', source: require('../assets/splash/glyphs/blind.png') },
  { id: 'thermostat', source: require('../assets/splash/glyphs/thermostat.png') },
  { id: 'radiator', source: require('../assets/splash/glyphs/radiator.png') },
  { id: 'motion', source: require('../assets/splash/glyphs/motion.png') },
  { id: 'thermometer', source: require('../assets/splash/glyphs/thermometer.png') },
  { id: 'weather', source: require('../assets/splash/glyphs/weather.png') },
  { id: 'window', source: require('../assets/splash/glyphs/window.png') },
  { id: 'lock', source: require('../assets/splash/glyphs/lock.png') },
  { id: 'air', source: require('../assets/splash/glyphs/air.png') },
  { id: 'panel', source: require('../assets/splash/glyphs/panel.png') },
  { id: 'socket', source: require('../assets/splash/glyphs/socket.png') }
] as const;

const FLIGHT_MS = 2400;
const STAGGER_MS = 80;
const HOLD_MS = 700;
const REDUCED_HOLD_MS = 1200;
const LOGO_Y = 0.46;

type Route = { side: number; along: number; delayIndex: number };

function makeRoutes(count: number): Route[] {
  const order = Array.from({ length: count }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = order[index] ?? index;
    order[index] = order[swap] ?? swap;
    order[swap] = current;
  }
  return order.map((delayIndex) => ({
    side: Math.floor(Math.random() * 4),
    along: 0.08 + Math.random() * 0.84,
    delayIndex
  }));
}

function origin(route: Route, width: number, height: number): { x: number; y: number } {
  const bleed = Math.max(120, Math.min(width, height) * 0.22);
  if (route.side === 0) {
    return { x: route.along * width, y: -bleed };
  }
  if (route.side === 1) {
    return { x: width + bleed, y: route.along * height };
  }
  if (route.side === 2) {
    return { x: route.along * width, y: height + bleed };
  }
  return { x: -bleed, y: route.along * height };
}

function landing(index: number, count: number, width: number, height: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  return {
    x: width * 0.5 + Math.cos(angle) * width * 0.36,
    y: height * LOGO_Y + Math.sin(angle) * height * 0.2
  };
}

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function samples(from: number, to: number, steps: number): number[] {
  return Array.from({ length: steps + 1 }, (_, step) => from + ((to - from) * step) / steps);
}

export function LaunchSplash({ t, onFinished }: { t: (path: string) => string; onFinished: () => void }) {
  const { width, height } = useWindowDimensions();
  const routes = useRef(makeRoutes(GLYPHS.length)).current;
  const clock = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const maxDelay = (GLYPHS.length - 1) * STAGGER_MS;
  const total = FLIGHT_MS + maxDelay + HOLD_MS;
  const glyphSide = Math.min(72, Math.max(52, width * 0.15));
  const logoSide = width * 0.32;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let animation: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (cancelled || finished.current) {
          return;
        }
        if (enabled) {
          setReduceMotion(true);
          timer = setTimeout(finish, REDUCED_HOLD_MS);
          return;
        }
        animation = Animated.timing(clock, {
          toValue: 1,
          duration: total,
          easing: Easing.linear,
          useNativeDriver: true
        });
        animation.start(({ finished: completed }) => {
          if (completed) {
            finish();
          }
        });
      })
      .catch(() => {
        if (!cancelled) {
          finish();
        }
      });
    return () => {
      cancelled = true;
      animation?.stop();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [clock, total]);

  function finish() {
    if (finished.current) {
      return;
    }
    finished.current = true;
    clock.stopAnimation();
    onFinished();
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <Image source={require('../assets/splash/field.png')} style={styles.field} resizeMode="cover" />
      <View style={styles.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {GLYPHS.map((glyph, index) => {
          const route = routes[index] ?? { side: 0, along: 0.5, delayIndex: index };
          const start = origin(route, width, height);
          const end = landing(index, GLYPHS.length, width, height);
          const delay = route.delayIndex * STAGGER_MS;
          const input = samples(delay / total, (delay + FLIGHT_MS) / total, 8);
          const travel = input.map((_, step) => smooth(step / 8));
          const opacityInput = [delay / total, (delay + FLIGHT_MS * 0.18) / total, 1];
          return (
            <Animated.Image
              key={glyph.id}
              source={glyph.source}
              style={{
                position: 'absolute',
                width: glyphSide,
                height: glyphSide,
                opacity: reduceMotion
                  ? 1
                  : clock.interpolate({
                      inputRange: opacityInput,
                      outputRange: [0, 1, 1],
                      extrapolate: 'clamp'
                    }),
                transform: [
                  {
                    translateX: reduceMotion
                      ? end.x - glyphSide / 2
                      : clock.interpolate({
                          inputRange: input,
                          outputRange: travel.map((amount) => start.x + (end.x - start.x) * amount - glyphSide / 2),
                          extrapolate: 'clamp'
                        })
                  },
                  {
                    translateY: reduceMotion
                      ? end.y - glyphSide / 2
                      : clock.interpolate({
                          inputRange: input,
                          outputRange: travel.map((amount) => start.y + (end.y - start.y) * amount - glyphSide / 2),
                          extrapolate: 'clamp'
                        })
                  },
                  {
                    scale: reduceMotion
                      ? 1
                      : clock.interpolate({
                          inputRange: input,
                          outputRange: travel.map((amount) => 0.94 + 0.06 * amount),
                          extrapolate: 'clamp'
                        })
                  }
                ]
              }}
            />
          );
        })}
        <Image
          source={require('../assets/logo.png')}
          accessibilityLabel="KHomeEasy"
          style={{
            position: 'absolute',
            width: logoSide,
            height: logoSide,
            left: width * 0.5 - logoSide / 2,
            top: height * LOGO_Y - logoSide / 2,
            borderRadius: logoSide * 0.22
          }}
        />
      </View>
      <SafeAreaView style={styles.controls} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Splash.skip')}
            onPress={finish}
            style={styles.skip}
          >
            <Text style={styles.skipText}>{t('Splash.skip')}</Text>
          </Pressable>
        </View>
        <View style={styles.bottom}>
          <Text style={styles.caption}>{t('Splash.caption')}</Text>
          <Text style={styles.trademark}>{t('Safety.trademark')}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1C33' },
  field: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  stage: { ...StyleSheet.absoluteFill },
  controls: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 8 },
  topRow: { alignItems: 'flex-end' },
  skip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)'
  },
  skipText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  bottom: { gap: 8, alignItems: 'center', paddingBottom: 8 },
  caption: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 440,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowRadius: 4
  },
  trademark: { color: 'rgba(255,255,255,0.72)', fontSize: 11, lineHeight: 16, textAlign: 'center', maxWidth: 520 }
});
