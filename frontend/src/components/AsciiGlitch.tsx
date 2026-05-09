import { useEffect, useState, useMemo } from "react";

import { cn } from "@/lib/utils";

const STASH_ASCII = String.raw`
 ███████╗████████╗ █████╗ ███████╗██╗  ██╗
 ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║  ██║
 ███████╗   ██║   ███████║███████╗███████║
 ╚════██║   ██║   ██╔══██║╚════██║██╔══██║
 ███████║   ██║   ██║  ██║███████║██║  ██║
 ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
`.replace(/^\n/, "");

const GLITCH_CHARS = "▓▒░█▌▐│┤├┼╳╱╲╬═◢◣◤◥▚▞";

interface Props {
  art?: string;
  intervalMs?: number;
  intensity?: number;
  className?: string;
}

export function AsciiGlitch({
  art = STASH_ASCII,
  intervalMs = 90,
  intensity = 4,
  className,
}: Props) {
  const positions = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < art.length; i++) {
      const c = art[i];
      if (c !== " " && c !== "\n") out.push(i);
    }
    return out;
  }, [art]);

  const [frame, setFrame] = useState(art);

  useEffect(() => {
    if (positions.length === 0) return;
    const id = window.setInterval(() => {
      const chars = art.split("");
      const count = 1 + Math.floor(Math.random() * intensity);
      for (let i = 0; i < count; i++) {
        const pos = positions[Math.floor(Math.random() * positions.length)];
        chars[pos] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
      setFrame(chars.join(""));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [art, positions, intervalMs, intensity]);

  return (
    <pre
      aria-hidden
      className={cn(
        "select-none whitespace-pre font-mono text-[10px] leading-[1.05] text-foreground",
        className,
      )}
    >
      {frame}
    </pre>
  );
}
