import { useEffect, useRef } from "react";

// Motor de Audio Global (fuera del hook para evitar crear múltiples contextos)
let audioCtx: AudioContext | null = null;
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
}

export function useNotificationSound(soundEnabled: boolean) {
    // Usamos una referencia para no tener que añadir soundEnabled como 
    // dependencia en los listeners y evitar cierres obsoletos (stale closures)
    const soundEnabledRef = useRef(soundEnabled);

    useEffect(() => {
        soundEnabledRef.current = soundEnabled;
    }, [soundEnabled]);

    // Desbloqueador global de audio (espera el primer click en la interfaz)
    useEffect(() => {
        const unlockAudio = () => {
            const ctx = getAudioContext();
            if (ctx.state === "suspended") {
                ctx.resume();
            }
            document.removeEventListener("click", unlockAudio);
        };
        document.addEventListener("click", unlockAudio);

        return () => document.removeEventListener("click", unlockAudio);
    }, []);

    // La función real que emite el "Bloop"
    const playSound = () => {
        if (!soundEnabledRef.current) return;
        try {
            const ctx = getAudioContext();
            if (ctx.state === "suspended") {
                ctx.resume();
            }

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            // Frecuencia que baja rápidamente (efecto "bloop")
            osc.type = "sine";
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);

            // Volumen que se desvanece suavemente
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) {
            console.error("Audio no soportado o bloqueado", e);
        }
    };

    return playSound;
}