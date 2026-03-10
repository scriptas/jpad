import { useThemeStore } from "../store/useThemeStore";

const NeonIcon = ({ size = 16, className = "" }) => {
    const activeThemeId = useThemeStore((state) => state.activeThemeId);
    const isCyberpunk = activeThemeId === "cyberpunk-vibe";

    // Use default pink for Cyberpunk mode, otherwise use theme colors
    const primaryColor = isCyberpunk ? "#FF00FF" : "var(--color-primary)";
    const hoverColor = isCyberpunk ? "#FF33BB" : "var(--color-primary-hover)";

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ overflow: 'visible' }}
        >
            <defs>
                {/* Dynamic Neon Glow Filter */}
                <filter id="neon-glow-dynamic" x="-50%" y="-50%" width="200%" height="200%" filterUnits="userSpaceOnUse">
                    <feGaussianBlur stdDeviation="15" result="blur" />
                    <feFlood floodColor={primaryColor} result="glowColor" />
                    <feComposite in="glowColor" in2="blur" operator="in" result="softGlow_colored" />
                    <feMerge>
                        <feMergeNode in="softGlow_colored" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                {/* Theme-aware Gradient */}
                <linearGradient id="theme-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={primaryColor} />
                    <stop offset="100%" stopColor={hoverColor} />
                </linearGradient>
            </defs>

            <g filter="url(#neon-glow-dynamic)">
                {/* Main Body */}
                <rect
                    x="10"
                    y="60"
                    width="492"
                    height="442"
                    rx="40"
                    fill={primaryColor}
                    fillOpacity="0.05"
                    stroke="url(#theme-gradient)"
                    strokeWidth="20"
                />

                {/* Tab Handle */}
                <path
                    d="M140 60 L140 10 Q140 5 150 5 L362 5 Q372 5 372 10 L372 60"
                    stroke="url(#theme-gradient)"
                    strokeWidth="20"
                    fill="none"
                />

                {/* Eyes */}
                <circle cx="180" cy="180" r="28" fill="white" />
                <circle cx="332" cy="180" r="28" fill="white" />
            </g>
        </svg>
    );
};

export default NeonIcon;
