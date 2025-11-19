import React, { useRef, useEffect } from 'react';
import { playClickSound } from './audioUtils';

/**
 * Creates a ripple effect at the cursor's position on click.
 * @param event The mouse event from the click.
 */
export const createRipple = (event: React.MouseEvent<HTMLElement>) => {
  playClickSound();
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  const circle = document.createElement("span");
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add("ripple-effect");

  // Check for existing ripples and remove them
  const ripple = button.getElementsByClassName("ripple-effect")[0];
  if (ripple) {
    ripple.remove();
  }

  button.appendChild(circle);
};

/**
 * Custom React hook to create a mouse-following glow effect on an element.
 * @param ref A React ref attached to the target element.
 */
export const useGlow = (ref: React.RefObject<HTMLElement>) => {
    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            element.style.setProperty('--glow-x', `${x}px`);
            element.style.setProperty('--glow-y', `${y}px`);
        };

        const handleMouseLeave = () => {
            element.style.setProperty('--glow-x', `-1000px`);
            element.style.setProperty('--glow-y', `-1000px`);
        }

        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            element.removeEventListener('mousemove', handleMouseMove);
            element.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [ref]);
};
