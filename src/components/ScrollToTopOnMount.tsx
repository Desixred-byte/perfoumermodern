"use client";

import { useLayoutEffect } from "react";

export function ScrollToTopOnMount() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return null;
}
