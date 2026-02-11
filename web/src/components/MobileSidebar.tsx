"use client";

import { useState, useEffect } from "react";
import { Menu, X, LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarContent, MenuItem } from "./SidebarContent";
import { usePathname } from "next/navigation";

interface MobileSidebarProps {
    title: string;
    logo?: string;
    serverIcon?: string;
    items: MenuItem[];
    backLink?: {
        href: string;
        label: string;
    };
}

export function MobileSidebar(props: MobileSidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Close sidebar when route changes
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    return (
        <div>
            {/* Hamburger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="p-3 text-zinc-400 hover:text-white transition-colors"
                aria-label="Open Menu"
            >
                <Menu size={24} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                        />

                        {/* Sidebar Drawer */}
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 z-60 w-72 h-dvh shadow-xl"
                        >
                            <div className="h-full relative bg-[#060609]">
                                <SidebarContent
                                    {...props}
                                    onItemClick={() => setIsOpen(false)}
                                    className="w-full h-full border-r border-white/5"
                                />

                                {/* Close Button inside Drawer (Optional but good UX) */}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white md:hidden"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
