/*
	Rotating Images Component - Based on RotatingText from https://reactbits.dev/ts/tailwind/
*/

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import {
  motion,
  AnimatePresence,
  Transition,
  type VariantLabels,
  type Target,
  type TargetAndTransition,
} from "framer-motion";

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

export interface RotatingImagesRef {
  next: () => void;
  previous: () => void;
  jumpTo: (index: number) => void;
  reset: () => void;
}

export interface ImageItem {
  component: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
  size?: number;
  badge?: {
    text: string;
    className?: string;
  };
}

export interface RotatingImagesProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof motion.span>,
    "children" | "transition" | "initial" | "animate" | "exit"
  > {
  images: ImageItem[];
  transition?: Transition;
  initial?: boolean | Target | VariantLabels;
  animate?: boolean | VariantLabels | TargetAndTransition;
  exit?: Target | VariantLabels;
  animatePresenceMode?: "sync" | "wait";
  animatePresenceInitial?: boolean;
  rotationInterval?: number;
  loop?: boolean;
  auto?: boolean;
  onNext?: (index: number) => void;
  mainClassName?: string;
  imageClassName?: string;
}

const RotatingImages = forwardRef<RotatingImagesRef, RotatingImagesProps>(
  (
    {
      images,
      transition = { type: "spring", damping: 25, stiffness: 300 },
      initial = { y: "100%", opacity: 0 },
      animate = { y: 0, opacity: 1 },
      exit = { y: "-120%", opacity: 0 },
      animatePresenceMode = "wait",
      animatePresenceInitial = false,
      rotationInterval = 2000,
      loop = true,
      auto = true,
      onNext,
      mainClassName,
      imageClassName,
      ...rest
    },
    ref
  ) => {
    const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

    const handleIndexChange = useCallback(
      (newIndex: number) => {
        setCurrentImageIndex(newIndex);
        if (onNext) onNext(newIndex);
      },
      [onNext]
    );

    const next = useCallback(() => {
      const nextIndex =
        currentImageIndex === images.length - 1
          ? loop
            ? 0
            : currentImageIndex
          : currentImageIndex + 1;
      if (nextIndex !== currentImageIndex) {
        handleIndexChange(nextIndex);
      }
    }, [currentImageIndex, images.length, loop, handleIndexChange]);

    const previous = useCallback(() => {
      const prevIndex =
        currentImageIndex === 0
          ? loop
            ? images.length - 1
            : currentImageIndex
          : currentImageIndex - 1;
      if (prevIndex !== currentImageIndex) {
        handleIndexChange(prevIndex);
      }
    }, [currentImageIndex, images.length, loop, handleIndexChange]);

    const jumpTo = useCallback(
      (index: number) => {
        const validIndex = Math.max(0, Math.min(index, images.length - 1));
        if (validIndex !== currentImageIndex) {
          handleIndexChange(validIndex);
        }
      },
      [images.length, currentImageIndex, handleIndexChange]
    );

    const reset = useCallback(() => {
      if (currentImageIndex !== 0) {
        handleIndexChange(0);
      }
    }, [currentImageIndex, handleIndexChange]);

    useImperativeHandle(
      ref,
      () => ({
        next,
        previous,
        jumpTo,
        reset,
      }),
      [next, previous, jumpTo, reset]
    );

    useEffect(() => {
      if (!auto) return;
      const intervalId = setInterval(next, rotationInterval);
      return () => clearInterval(intervalId);
    }, [next, rotationInterval, auto]);

    const currentImage = images[currentImageIndex];
    const ImageComponent = currentImage.component;

    return (
      <motion.span
        className={cn(
          "inline-flex items-center justify-center relative",
          mainClassName
        )}
        {...rest}
        layout
        transition={transition}
      >
        <AnimatePresence
          mode={animatePresenceMode}
          initial={animatePresenceInitial}
        >
          <motion.span
            key={currentImageIndex}
            className="inline-flex items-center justify-center relative"
            layout
            initial={initial as any}
            animate={animate as any}
            exit={exit as any}
            transition={transition}
          >
            <ImageComponent
              size={currentImage.size || 24}
              className={cn(imageClassName, currentImage.className)}
            />
            {currentImage.badge && (
              <span
                className={cn(
                  "absolute -top-2 -right-2 bg-amber-500 text-black text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap shadow-lg",
                  currentImage.badge.className
                )}
              >
                {currentImage.badge.text}
              </span>
            )}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    );
  }
);

RotatingImages.displayName = "RotatingImages";
export default RotatingImages;
