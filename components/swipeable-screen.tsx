import { router } from 'expo-router';
import * as React from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { DRAWER_ORDER, ROUTE_TO_PATH, type DrawerRoute } from '@/lib/drawer-order';

const SWIPE_THRESHOLD = 60;

function navigateBy(route: DrawerRoute, delta: 1 | -1) {
  const idx = DRAWER_ORDER.indexOf(route);
  const nextIdx = idx + delta;
  if (nextIdx < 0 || nextIdx >= DRAWER_ORDER.length) return;
  const path = ROUTE_TO_PATH[DRAWER_ORDER[nextIdx]];
  router.navigate(path as never);
}

export function SwipeableScreen({
  route,
  children,
}: {
  route: DrawerRoute;
  children: React.ReactNode;
}) {
  const pan = React.useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-20, 20])
        .onEnd((e) => {
          if (e.translationX < -SWIPE_THRESHOLD) {
            runOnJS(navigateBy)(route, 1);
          } else if (e.translationX > SWIPE_THRESHOLD) {
            runOnJS(navigateBy)(route, -1);
          }
        }),
    [route]
  );

  return <GestureDetector gesture={pan}>{children as React.ReactElement}</GestureDetector>;
}
