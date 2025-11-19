// A simple utility to play short, base64-encoded audio sounds for UI feedback.
// Using base64 avoids needing to host separate audio files.

let isAudioUnlocked = false;

// A soft, low-key "pop" for hover effects
const hoverSound = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
hoverSound.volume = 0.1;

// A short, crisp "click" for navigation and actions
const clickSound = new Audio("data:audio/wav;base64,UklGRlIAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhHAAAAAIAAACAgICgoKCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCg==");
clickSound.volume = 0.2;

/**
 * This function must be called from a user-initiated event (like a click)
 * to unlock the browser's audio context. It should only be called once.
 */
export const unlockAudio = () => {
    if (isAudioUnlocked) return;

    // "Prime" the audio elements by playing and pausing them.
    // This satisfies the browser's user interaction requirement.
    const hoverPromise = hoverSound.play();
    if (hoverPromise !== undefined) {
        hoverPromise.then(() => hoverSound.pause()).catch(() => {});
    }
    
    const clickPromise = clickSound.play();
    if (clickPromise !== undefined) {
        clickPromise.then(() => clickSound.pause()).catch(() => {});
    }
    
    isAudioUnlocked = true;
};

export const playHoverSound = () => {
    if (!isAudioUnlocked) return; // Don't play if context is not unlocked
    hoverSound.currentTime = 0;
    hoverSound.play().catch(() => {}); // Catch any unexpected errors after unlocking
};

export const playClickSound = () => {
    if (!isAudioUnlocked) return; // Clicks also wait for the first interaction to unlock
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {}); // Catch any unexpected errors after unlocking
};
