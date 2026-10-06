import { createContext } from "react";

export interface ZoomTarget {
  /** URLs of the pictures to show large, in order. */
  images: string[];
  alt: string;
  /** Show the whole picture within the screen (a photo), rather than full width and scrolling (a long screenshot). */
  fit?: boolean;
}

/** Lets a plate ask the Reader to show its pictures enlarged. */
export const ZoomContext = createContext<(target: ZoomTarget) => void>(() => {});
