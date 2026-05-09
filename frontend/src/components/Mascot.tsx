import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

// Stashie — small amoeba blob made of █ blocks and gaps.
// Only the eyes change between frames.

function build(eyes: string): string {
  return [
    "  ███████",
    eyes,
    "  ███████",
  ].join("\n");
}

const IDLE = build(" ██ ███ ██");
const BLINK = build(" █████████");
const LOOK_R = build(" ███ ███ █");
const LOOK_L = build(" █ ███ ███");
const WIDE = build(" █  ███  █");
const SQUINT = build(" ████ █ ██");
const WINK_R = build(" ██ ██████");
const WINK_L = build(" ██████ ██");
const HAPPY = build(" █ █ █ █ █");
const DOTS = build(" ███ █ ███");
const PEEK_R = build(" █████ █ █");
const PEEK_L = build(" █ █ █████");

const NON_IDLE = [
  BLINK,
  LOOK_R,
  LOOK_L,
  WIDE,
  SQUINT,
  WINK_R,
  WINK_L,
  HAPPY,
  DOTS,
  PEEK_R,
  PEEK_L,
] as const;

const QUICK_FRAMES = new Set<string>([BLINK, WINK_R, WINK_L]);

const GLITCH_CHARS = "▓▒░█▌▐│┤├┼╳╱╲╬═◢◣◤◥▚▞";

interface Props {
  message?: string;
  className?: string;
  size?: "sm" | "md";
  glitchIntervalMs?: number;
  glitchIntensity?: number;
}

export function Mascot({
  message,
  className,
  size = "md",
  glitchIntervalMs = 100,
  glitchIntensity = 3,
}: Props) {
  const [baseFrame, setBaseFrame] = useState<string>(IDLE);
  const [display, setDisplay] = useState<string>(IDLE);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    function schedule() {
      const delay = 1400 + Math.random() * 1800;
      timer = window.setTimeout(() => {
        if (!active) return;
        const pick = NON_IDLE[Math.floor(Math.random() * NON_IDLE.length)];
        setBaseFrame(pick);
        const restoreMs = QUICK_FRAMES.has(pick) ? 160 : 540;
        timer = window.setTimeout(() => {
          if (!active) return;
          setBaseFrame(IDLE);
          schedule();
        }, restoreMs);
      }, delay);
    }

    schedule();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    setDisplay(baseFrame);
    const positions: number[] = [];
    for (let i = 0; i < baseFrame.length; i++) {
      const c = baseFrame[i];
      if (c !== " " && c !== "\n") positions.push(i);
    }
    if (positions.length === 0) return;

    const id = window.setInterval(() => {
      const chars = baseFrame.split("");
      const count = 1 + Math.floor(Math.random() * glitchIntensity);
      for (let i = 0; i < count; i++) {
        const pos = positions[Math.floor(Math.random() * positions.length)];
        chars[pos] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
      setDisplay(chars.join(""));
    }, glitchIntervalMs);
    return () => window.clearInterval(id);
  }, [baseFrame, glitchIntervalMs, glitchIntensity]);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <pre
        aria-hidden
        className={cn(
          "select-none whitespace-pre font-mono leading-[1.05] text-foreground",
          size === "sm" ? "text-[10px]" : "text-[13px]",
        )}
      >
        {display}
      </pre>
      {message && (
        <p
          className={cn(
            "max-w-[28ch] text-center text-muted-foreground",
            size === "sm" ? "text-[11px]" : "text-[12px]",
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
