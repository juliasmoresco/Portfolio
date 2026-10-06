import { useMediaQuery } from "./hooks/useMediaQuery";
import { MOBILE_QUERY } from "./layout";
import { HomeDesktop } from "./pages/HomeDesktop/HomeDesktop";
import { HomeMobile } from "./pages/HomeMobile/HomeMobile";

/**
 * Only one home, and so one 3D scene, is mounted at a time. Switching layouts unmounts the other
 * one, which also closes any open Reader.
 */
export function App() {
  const mobile = useMediaQuery(MOBILE_QUERY);
  return mobile ? <HomeMobile key="mobile" /> : <HomeDesktop key="desktop" />;
}
