import { useState, useEffect } from "react";
import { platform } from "@tauri-apps/plugin-os";

export function useMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const p = platform();
        setIsMobile(p === "android" || p === "ios");
    }, []);

    return isMobile;
}
