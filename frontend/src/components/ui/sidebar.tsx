"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

export interface Links {
	label: string;
	href: string;
	icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
	open: boolean;
	setOpen: React.Dispatch<React.SetStateAction<boolean>>;
	animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
	undefined,
);

export const useSidebar = () => {
	const context = useContext(SidebarContext);
	if (!context) {
		throw new Error("useSidebar must be used within a SidebarProvider");
	}
	return context;
};

export const SidebarProvider = ({
	children,
	open: openProp,
	setOpen: setOpenProp,
	animate = true,
}: {
	children: React.ReactNode;
	open?: boolean;
	setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
	animate?: boolean;
}) => {
	const [openState, setOpenState] = useState(false);
	const open = openProp !== undefined ? openProp : openState;
	const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

	return (
		<SidebarContext.Provider value={{ open, setOpen, animate }}>
			{children}
		</SidebarContext.Provider>
	);
};

export const Sidebar = ({
	children,
	open,
	setOpen,
	animate,
}: {
	children: React.ReactNode;
	open?: boolean;
	setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
	animate?: boolean;
}) => {
	return (
		<SidebarProvider open={open} setOpen={setOpen} animate={animate}>
			{children}
		</SidebarProvider>
	);
};

export const SidebarBody = ({
	"data-testid": testId,
	"data-console": consoleKind,
	...props
}: React.ComponentProps<typeof motion.div> & {
	"data-testid"?: string;
	"data-console"?: string;
}) => {
	return (
		<>
			<DesktopSidebar
				data-testid={testId}
				data-console={consoleKind}
				{...props}
			/>
			<MobileSidebar {...(props as React.ComponentProps<"div">)} />
		</>
	);
};

export const DesktopSidebar = ({
	className,
	children,
	...props
}: React.ComponentProps<typeof motion.div>) => {
	const { open, setOpen, animate } = useSidebar();
	return (
		<motion.div
			className={cn(
				"hidden h-dvh w-[300px] shrink-0 flex-col border-r border-border bg-surface px-4 py-4 md:flex",
				className,
			)}
			animate={{
				width: animate ? (open ? "300px" : "60px") : "300px",
			}}
			onMouseEnter={() => setOpen(true)}
			onMouseLeave={() => setOpen(false)}
			{...props}
		>
			{children}
		</motion.div>
	);
};

export const MobileSidebar = ({
	className,
	children,
	...props
}: React.ComponentProps<"div">) => {
	const { open, setOpen } = useSidebar();
	return (
		<>
			<div
				className={cn(
					"flex h-11 w-full flex-row items-center justify-between bg-surface px-4 md:hidden",
				)}
				{...props}
			>
				<button
					type="button"
					className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-foreground"
					aria-label={open ? "Fechar menu de navegação" : "Abrir menu de navegação"}
					aria-expanded={open}
					onClick={() => setOpen(!open)}
				>
					<Menu className="size-5" aria-hidden="true" />
				</button>
			</div>
			<AnimatePresence>
				{open ? (
					<motion.div
						key="mobile-sidebar"
						initial={{ x: "-100%", opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						exit={{ x: "-100%", opacity: 0 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className={cn(
							"fixed inset-0 z-40 flex h-full w-full flex-col justify-between bg-background p-10 md:hidden",
							className,
						)}
						role="dialog"
						aria-modal="true"
						aria-label="Menu de navegação"
					>
						<button
							type="button"
							className="absolute top-4 right-4 z-50 flex size-11 cursor-pointer items-center justify-center rounded-lg text-foreground"
							aria-label="Fechar menu"
							onClick={() => setOpen(false)}
						>
							<X className="size-5" aria-hidden="true" />
						</button>
						{children}
					</motion.div>
				) : null}
			</AnimatePresence>
		</>
	);
};

export const SidebarLink = ({
	link,
	className,
	onClick,
	...props
}: {
	link: Links;
	className?: string;
	onClick?: React.MouseEventHandler<HTMLAnchorElement>;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
	const { open, animate } = useSidebar();
	return (
		<a
			href={link.href}
			onClick={onClick}
			className={cn(
				"group/sidebar flex min-h-11 cursor-pointer items-center justify-start gap-2 rounded-lg py-2 text-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
				className,
			)}
			{...props}
		>
			{link.icon}
			<motion.span
				animate={{
					display: animate ? (open ? "inline-block" : "none") : "inline-block",
					opacity: animate ? (open ? 1 : 0) : 1,
				}}
				className="m-0 inline-block whitespace-pre p-0 text-sm transition duration-150 group-hover/sidebar:translate-x-1"
			>
				{link.label}
			</motion.span>
		</a>
	);
};
