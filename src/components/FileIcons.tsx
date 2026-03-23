/**
 * FileIcons — Custom SVG file icons for the sidebar file tree.
 * Inspired by VS Code / Slack-style file icons with vibrant, distinctive colors.
 */

import React from "react";

interface IconProps {
    size?: number;
    className?: string;
}

// ─── Helper: Base file shape with colored tab ────────────────────────────
const FileBase: React.FC<{
    size: number;
    color: string;
    children?: React.ReactNode;
}> = ({ size, color, children }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
    >
        {/* File body */}
        <path
            d="M6 3C6 1.9 6.9 1 8 1H19L26 8V29C26 30.1 25.1 31 24 31H8C6.9 31 6 30.1 6 29V3Z"
            fill={color}
            fillOpacity="0.12"
        />
        {/* Fold corner */}
        <path
            d="M19 1L26 8H21C19.9 8 19 7.1 19 6V1Z"
            fill={color}
            fillOpacity="0.3"
        />
        {/* Border */}
        <path
            d="M6 3C6 1.9 6.9 1 8 1H19L26 8V29C26 30.1 25.1 31 24 31H8C6.9 31 6 30.1 6 29V3Z"
            stroke={color}
            strokeWidth="1.2"
            strokeLinejoin="round"
            fill="none"
        />
        {children}
    </svg>
);

// ─── Helper: Circle icon (for languages with logos) ─────────────────────
const CircleBadge: React.FC<{
    size: number;
    color: string;
    bgColor?: string;
    children?: React.ReactNode;
}> = ({ size, color, bgColor, children }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
    >
        <rect
            x="2"
            y="2"
            width="28"
            height="28"
            rx="6"
            fill={bgColor || color}
            fillOpacity="0.15"
            stroke={color}
            strokeWidth="1.2"
        />
        {children}
    </svg>
);

// ═══════════════════════════════════════════════════════════════
//  JPad .jt Icon — Notepad with lines of text
// ═══════════════════════════════════════════════════════════════
export const JtFileIcon: React.FC<IconProps> = ({ size = 16, className }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ flexShrink: 0 }}
    >
        {/* Notepad body */}
        <rect
            x="5"
            y="4"
            width="22"
            height="25"
            rx="3"
            fill="var(--color-primary)"
            fillOpacity="0.1"
            stroke="var(--color-primary)"
            strokeWidth="1.3"
        />
        {/* Tab/handle at top */}
        <path
            d="M11 4V2C11 1.45 11.45 1 12 1H20C20.55 1 21 1.45 21 2V4"
            stroke="var(--color-primary)"
            strokeWidth="1.3"
            fill="none"
        />
        {/* Spiral rings */}
        <line x1="8" y1="4" x2="8" y2="4" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Text lines */}
        <line x1="10" y1="10" x2="22" y2="10" stroke="var(--color-primary)" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
        <line x1="10" y1="14" x2="20" y2="14" stroke="var(--color-primary)" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
        <line x1="10" y1="18" x2="21" y2="18" stroke="var(--color-primary)" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
        <line x1="10" y1="22" x2="17" y2="22" stroke="var(--color-primary)" strokeWidth="1.3" strokeLinecap="round" opacity="0.4" />
    </svg>
);

// ═══════════════════════════════════════════════════════════════
//  JavaScript
// ═══════════════════════════════════════════════════════════════
export const JsFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#F7DF1E" bgColor="#F7DF1E">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="14"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#323330"
        >
            JS
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  TypeScript
// ═══════════════════════════════════════════════════════════════
export const TsFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#3178C6" bgColor="#3178C6">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="14"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            TS
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Python
// ═══════════════════════════════════════════════════════════════
export const PyFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#3776AB">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="12"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#3776AB"
        >
            PY
        </text>
        {/* Snake hint — two dots */}
        <circle cx="12" cy="9" r="1.5" fill="#FFD43B" />
        <circle cx="20" cy="9" r="1.5" fill="#3776AB" />
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Rust
// ═══════════════════════════════════════════════════════════════
export const RsFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#CE422B">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="12"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#CE422B"
        >
            RS
        </text>
        {/* Gear tooth hint */}
        <circle cx="16" cy="10" r="3" stroke="#CE422B" strokeWidth="1" fill="none" />
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  C
// ═══════════════════════════════════════════════════════════════
export const CFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#A8B9CC" bgColor="#555555">
        <text
            x="16"
            y="23"
            textAnchor="middle"
            fontSize="18"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#A8B9CC"
        >
            C
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  C++
// ═══════════════════════════════════════════════════════════════
export const CppFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#00599C" bgColor="#00599C">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            C++
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  C#
// ═══════════════════════════════════════════════════════════════
export const CsFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#68217A" bgColor="#68217A">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="12"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            C#
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Java
// ═══════════════════════════════════════════════════════════════
export const JavaFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#E76F00" bgColor="#5382A1">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#E76F00"
        >
            JV
        </text>
        {/* Coffee steam */}
        <path d="M13 8 Q14 6 13 4" stroke="#E76F00" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M16 8 Q17 6 16 4" stroke="#E76F00" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6" />
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Kotlin
// ═══════════════════════════════════════════════════════════════
export const KtFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#7F52FF" bgColor="#7F52FF">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="12"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            KT
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Swift
// ═══════════════════════════════════════════════════════════════
export const SwiftFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#FA7343" bgColor="#FA7343">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            SW
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Go
// ═══════════════════════════════════════════════════════════════
export const GoFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#00ADD8" bgColor="#00ADD8">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="14"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            GO
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Ruby
// ═══════════════════════════════════════════════════════════════
export const RbFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#CC342D" bgColor="#CC342D">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="12"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            RB
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  PHP
// ═══════════════════════════════════════════════════════════════
export const PhpFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#777BB4" bgColor="#777BB4">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            PHP
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  HTML
// ═══════════════════════════════════════════════════════════════
export const HtmlFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <FileBase size={size} color="#E44D26">
        <text
            x="16"
            y="23"
            textAnchor="middle"
            fontSize="8"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#E44D26"
        >
            {"</>"}
        </text>
    </FileBase>
);

// ═══════════════════════════════════════════════════════════════
//  CSS / SCSS / SASS / LESS
// ═══════════════════════════════════════════════════════════════
export const CssFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#264de4" bgColor="#264de4">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="9"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            CSS
        </text>
    </CircleBadge>
);

export const ScssFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#CD6799" bgColor="#CD6799">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="9"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            SC
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  JSON
// ═══════════════════════════════════════════════════════════════
export const JsonFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <FileBase size={size} color="#F5A623">
        <text
            x="16"
            y="23"
            textAnchor="middle"
            fontSize="7"
            fontWeight="700"
            fontFamily="'JetBrains Mono', monospace"
            fill="#F5A623"
        >
            {"{ }"}
        </text>
    </FileBase>
);

// ═══════════════════════════════════════════════════════════════
//  YAML / TOML
// ═══════════════════════════════════════════════════════════════
export const YamlFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <FileBase size={size} color="#CB171E">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fontFamily="'Inter', sans-serif"
            fill="#CB171E"
        >
            YML
        </text>
    </FileBase>
);

export const TomlFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <FileBase size={size} color="#9C4221">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="7"
            fontWeight="700"
            fontFamily="'Inter', sans-serif"
            fill="#9C4221"
        >
            TML
        </text>
    </FileBase>
);

// ═══════════════════════════════════════════════════════════════
//  Markdown
// ═══════════════════════════════════════════════════════════════
export const MdFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <FileBase size={size} color="#519aba">
        <text
            x="16"
            y="23"
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#519aba"
        >
            M↓
        </text>
    </FileBase>
);

// ═══════════════════════════════════════════════════════════════
//  Shell / Bash
// ═══════════════════════════════════════════════════════════════
export const ShFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#4EAA25" bgColor="#2D333B">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            fontFamily="'JetBrains Mono', monospace"
            fill="#4EAA25"
        >
            $_
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  SQL
// ═══════════════════════════════════════════════════════════════
export const SqlFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#336791" bgColor="#336791">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            SQL
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Lua
// ═══════════════════════════════════════════════════════════════
export const LuaFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#000080" bgColor="#000080">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            LUA
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Dart
// ═══════════════════════════════════════════════════════════════
export const DartFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#0175C2" bgColor="#0175C2">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            DRT
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  R
// ═══════════════════════════════════════════════════════════════
export const RFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#276DC3" bgColor="#276DC3">
        <text
            x="16"
            y="23"
            textAnchor="middle"
            fontSize="18"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            R
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Scala
// ═══════════════════════════════════════════════════════════════
export const ScalaFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#DC322F" bgColor="#DC322F">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            SC
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Elixir
// ═══════════════════════════════════════════════════════════════
export const ExFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#6E4A7E" bgColor="#6E4A7E">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="12"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            EX
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Haskell
// ═══════════════════════════════════════════════════════════════
export const HsFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#5D4F85" bgColor="#5D4F85">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="12"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            HS
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Perl
// ═══════════════════════════════════════════════════════════════
export const PlFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#39457E" bgColor="#39457E">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="12"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            PL
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Zig
// ═══════════════════════════════════════════════════════════════
export const ZigFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#F7A41D" bgColor="#F7A41D">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#1a1a2e"
        >
            ZIG
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  XML
// ═══════════════════════════════════════════════════════════════
export const XmlFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <FileBase size={size} color="#F16529">
        <text
            x="16"
            y="23"
            textAnchor="middle"
            fontSize="7"
            fontWeight="700"
            fontFamily="'Inter', sans-serif"
            fill="#F16529"
        >
            XML
        </text>
    </FileBase>
);

// ═══════════════════════════════════════════════════════════════
//  Docker
// ═══════════════════════════════════════════════════════════════
export const DockerFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#2496ED" bgColor="#2496ED">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="8"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            🐳
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Image file icon
// ═══════════════════════════════════════════════════════════════
export const ImageFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
    >
        {/* Frame */}
        <rect
            x="3"
            y="5"
            width="26"
            height="22"
            rx="3"
            fill="#4CAF50"
            fillOpacity="0.1"
            stroke="#4CAF50"
            strokeWidth="1.2"
        />
        {/* Sun */}
        <circle cx="11" cy="13" r="3" fill="#FFD54F" />
        {/* Mountains */}
        <path
            d="M3 23L10 16L15 20L21 13L29 23"
            stroke="#4CAF50"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="#4CAF50"
            fillOpacity="0.15"
        />
    </svg>
);

// ═══════════════════════════════════════════════════════════════
//  Video file icon
// ═══════════════════════════════════════════════════════════════
export const VideoFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
    >
        {/* Film reel body */}
        <rect
            x="3"
            y="5"
            width="26"
            height="22"
            rx="3"
            fill="#E040FB"
            fillOpacity="0.1"
            stroke="#E040FB"
            strokeWidth="1.2"
        />
        {/* Play triangle */}
        <path
            d="M13 11L22 16L13 21Z"
            fill="#E040FB"
            fillOpacity="0.8"
        />
        {/* Film sprocket holes */}
        <rect x="5" y="7" width="2" height="2" rx="0.5" fill="#E040FB" fillOpacity="0.4" />
        <rect x="5" y="23" width="2" height="2" rx="0.5" fill="#E040FB" fillOpacity="0.4" />
        <rect x="25" y="7" width="2" height="2" rx="0.5" fill="#E040FB" fillOpacity="0.4" />
        <rect x="25" y="23" width="2" height="2" rx="0.5" fill="#E040FB" fillOpacity="0.4" />
    </svg>
);

// ═══════════════════════════════════════════════════════════════
//  Audio file icon
// ═══════════════════════════════════════════════════════════════
export const AudioFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
    >
        <rect
            x="3"
            y="3"
            width="26"
            height="26"
            rx="6"
            fill="#FF6D00"
            fillOpacity="0.1"
            stroke="#FF6D00"
            strokeWidth="1.2"
        />
        {/* Music note */}
        <path
            d="M20 8V20C20 22.2 18.2 24 16 24C13.8 24 12 22.2 12 20C12 17.8 13.8 16 16 16C17.1 16 18 16.4 18.6 17V8H20Z"
            fill="#FF6D00"
            fillOpacity="0.7"
        />
        {/* Note flag */}
        <path
            d="M20 8C20 8 24 9 24 12"
            stroke="#FF6D00"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
        />
    </svg>
);

// ═══════════════════════════════════════════════════════════════
//  PDF
// ═══════════════════════════════════════════════════════════════
export const PdfFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <FileBase size={size} color="#FF1744">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="8"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#FF1744"
        >
            PDF
        </text>
    </FileBase>
);

// ═══════════════════════════════════════════════════════════════
//  Archive (zip, tar, gz, etc.)
// ═══════════════════════════════════════════════════════════════
export const ArchiveFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <FileBase size={size} color="#8D6E63">
        {/* Zipper line */}
        <line x1="16" y1="10" x2="16" y2="26" stroke="#8D6E63" strokeWidth="1.2" strokeDasharray="2 2" />
        <rect x="14" y="17" width="4" height="3" rx="0.5" fill="#8D6E63" fillOpacity="0.6" />
    </FileBase>
);

// ═══════════════════════════════════════════════════════════════
//  Git
// ═══════════════════════════════════════════════════════════════
export const GitFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <CircleBadge size={size} color="#F05033" bgColor="#F05033">
        <text
            x="16"
            y="22"
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            fontFamily="'Inter', sans-serif"
            fill="#ffffff"
        >
            GIT
        </text>
    </CircleBadge>
);

// ═══════════════════════════════════════════════════════════════
//  Env
// ═══════════════════════════════════════════════════════════════
export const EnvFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <FileBase size={size} color="#EDB321">
        {/* Key icon */}
        <circle cx="14" cy="18" r="3" stroke="#EDB321" strokeWidth="1.2" fill="none" />
        <line x1="17" y1="18" x2="22" y2="18" stroke="#EDB321" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="20" y1="18" x2="20" y2="15" stroke="#EDB321" strokeWidth="1.2" strokeLinecap="round" />
    </FileBase>
);

// ═══════════════════════════════════════════════════════════════
//  Config / Lock (package-lock, etc.)
// ═══════════════════════════════════════════════════════════════
export const LockFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <FileBase size={size} color="#607D8B">
        {/* Lock */}
        <rect x="12" y="18" width="8" height="6" rx="1" fill="#607D8B" fillOpacity="0.5" stroke="#607D8B" strokeWidth="0.8" />
        <path d="M14 18V15C14 13.34 15.34 12 17 12V12C18.66 12 20 13.34 20 15V18" stroke="#607D8B" strokeWidth="1" fill="none" />
    </FileBase>
);

// ═══════════════════════════════════════════════════════════════
//  Default / Unknown file
// ═══════════════════════════════════════════════════════════════
export const DefaultFileIcon: React.FC<IconProps> = ({ size = 16 }) => (
    <FileBase size={size} color="var(--color-text-muted)">
        {/* Lines of text */}
        <line x1="10" y1="14" x2="22" y2="14" stroke="var(--color-text-muted)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <line x1="10" y1="18" x2="20" y2="18" stroke="var(--color-text-muted)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
        <line x1="10" y1="22" x2="18" y2="22" stroke="var(--color-text-muted)" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
    </FileBase>
);


// ═══════════════════════════════════════════════════════════════
//  Extension → Icon mapping
// ═══════════════════════════════════════════════════════════════
const EXTENSION_MAP: Record<string, React.FC<IconProps>> = {
    // JPad native
    jt: JtFileIcon,

    // JavaScript / TypeScript
    js: JsFileIcon,
    jsx: JsFileIcon,
    mjs: JsFileIcon,
    cjs: JsFileIcon,
    ts: TsFileIcon,
    tsx: TsFileIcon,
    mts: TsFileIcon,
    cts: TsFileIcon,

    // Python
    py: PyFileIcon,
    pyw: PyFileIcon,
    pyi: PyFileIcon,
    pyx: PyFileIcon,

    // Rust
    rs: RsFileIcon,

    // C / C++
    c: CFileIcon,
    h: CFileIcon,
    cpp: CppFileIcon,
    cc: CppFileIcon,
    cxx: CppFileIcon,
    hpp: CppFileIcon,
    hxx: CppFileIcon,

    // C#
    cs: CsFileIcon,

    // Java
    java: JavaFileIcon,
    jar: JavaFileIcon,

    // Kotlin
    kt: KtFileIcon,
    kts: KtFileIcon,

    // Swift
    swift: SwiftFileIcon,

    // Go
    go: GoFileIcon,

    // Ruby
    rb: RbFileIcon,
    erb: RbFileIcon,
    rake: RbFileIcon,
    gemspec: RbFileIcon,

    // PHP
    php: PhpFileIcon,

    // HTML
    html: HtmlFileIcon,
    htm: HtmlFileIcon,
    svelte: HtmlFileIcon,
    vue: HtmlFileIcon,

    // CSS
    css: CssFileIcon,
    scss: ScssFileIcon,
    sass: ScssFileIcon,
    less: ScssFileIcon,
    styl: ScssFileIcon,

    // JSON
    json: JsonFileIcon,
    jsonc: JsonFileIcon,
    json5: JsonFileIcon,

    // YAML / TOML
    yml: YamlFileIcon,
    yaml: YamlFileIcon,
    toml: TomlFileIcon,

    // Markdown
    md: MdFileIcon,
    mdx: MdFileIcon,
    markdown: MdFileIcon,

    // Shell
    sh: ShFileIcon,
    bash: ShFileIcon,
    zsh: ShFileIcon,
    fish: ShFileIcon,
    ps1: ShFileIcon,
    bat: ShFileIcon,
    cmd: ShFileIcon,

    // SQL
    sql: SqlFileIcon,

    // Lua
    lua: LuaFileIcon,

    // Dart
    dart: DartFileIcon,

    // R
    r: RFileIcon,
    rmd: RFileIcon,

    // Scala
    scala: ScalaFileIcon,
    sc: ScalaFileIcon,

    // Elixir
    ex: ExFileIcon,
    exs: ExFileIcon,

    // Haskell
    hs: HsFileIcon,
    lhs: HsFileIcon,

    // Perl
    pl: PlFileIcon,
    pm: PlFileIcon,

    // Zig
    zig: ZigFileIcon,

    // XML
    xml: XmlFileIcon,
    svg: XmlFileIcon,
    xsl: XmlFileIcon,
    xslt: XmlFileIcon,

    // Docker
    dockerfile: DockerFileIcon,

    // Images
    png: ImageFileIcon,
    jpg: ImageFileIcon,
    jpeg: ImageFileIcon,
    gif: ImageFileIcon,
    bmp: ImageFileIcon,
    webp: ImageFileIcon,
    ico: ImageFileIcon,
    tiff: ImageFileIcon,
    tif: ImageFileIcon,
    avif: ImageFileIcon,

    // Video
    mp4: VideoFileIcon,
    mkv: VideoFileIcon,
    avi: VideoFileIcon,
    mov: VideoFileIcon,
    wmv: VideoFileIcon,
    flv: VideoFileIcon,
    webm: VideoFileIcon,
    m4v: VideoFileIcon,

    // Audio
    mp3: AudioFileIcon,
    wav: AudioFileIcon,
    flac: AudioFileIcon,
    ogg: AudioFileIcon,
    aac: AudioFileIcon,
    wma: AudioFileIcon,
    m4a: AudioFileIcon,

    // PDF
    pdf: PdfFileIcon,

    // Archives
    zip: ArchiveFileIcon,
    tar: ArchiveFileIcon,
    gz: ArchiveFileIcon,
    bz2: ArchiveFileIcon,
    xz: ArchiveFileIcon,
    "7z": ArchiveFileIcon,
    rar: ArchiveFileIcon,

    // Git
    gitignore: GitFileIcon,
    gitattributes: GitFileIcon,
    gitmodules: GitFileIcon,

    // Env
    env: EnvFileIcon,

    // Lock files
    lock: LockFileIcon,
};

// Special full filename matches (for files without extensions like Dockerfile)
const FILENAME_MAP: Record<string, React.FC<IconProps>> = {
    dockerfile: DockerFileIcon,
    "docker-compose.yml": DockerFileIcon,
    "docker-compose.yaml": DockerFileIcon,
    makefile: ShFileIcon,
    gemfile: RbFileIcon,
    rakefile: RbFileIcon,
    ".gitignore": GitFileIcon,
    ".gitattributes": GitFileIcon,
    ".env": EnvFileIcon,
    ".env.local": EnvFileIcon,
    ".env.production": EnvFileIcon,
    ".env.development": EnvFileIcon,
    ".env.example": EnvFileIcon,
};


/**
 * Returns the appropriate file icon component for a given filename.
 */
export function getFileIconForName(
    name: string,
    size: number = 14,
    className?: string
): React.ReactElement {
    const lowerName = name.toLowerCase();

    // 1. Check exact filename matches first
    const FilenameIcon = FILENAME_MAP[lowerName];
    if (FilenameIcon) {
        return <FilenameIcon size={size} className={className} />;
    }

    // 2. Check extension
    const lastDot = lowerName.lastIndexOf(".");
    if (lastDot !== -1) {
        const ext = lowerName.slice(lastDot + 1);
        const ExtIcon = EXTENSION_MAP[ext];
        if (ExtIcon) {
            return <ExtIcon size={size} className={className} />;
        }

        // 3. Check compound extensions like .env.local
        const firstDot = lowerName.indexOf(".");
        if (firstDot !== -1) {
            const firstExt = lowerName.slice(firstDot + 1);
            // check against env-like patterns
            if (firstExt.startsWith("env")) {
                return <EnvFileIcon size={size} className={className} />;
            }
        }
    }

    // 4. Default
    return <DefaultFileIcon size={size} className={className} />;
}
