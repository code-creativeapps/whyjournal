import * as React from 'react';

import type { DrawerRoute } from '@/lib/drawer-order';

export function SwipeableScreen({
  children,
}: {
  route: DrawerRoute;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
