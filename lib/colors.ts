import { ColorKey } from "./types";

interface ColorClasses {
  label: string;
  dot: string;
  bar: string;
  chip: string;
  chipDone: string;
  ring: string;
}

export const COLORS: Record<ColorKey, ColorClasses> = {
  blue: {
    label: "Blue",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
    chip: "bg-blue-100 text-blue-800 border-blue-200",
    chipDone: "bg-blue-50 text-blue-400 border-blue-100",
    ring: "focus:ring-blue-400",
  },
  purple: {
    label: "Purple",
    dot: "bg-purple-500",
    bar: "bg-purple-500",
    chip: "bg-purple-100 text-purple-800 border-purple-200",
    chipDone: "bg-purple-50 text-purple-400 border-purple-100",
    ring: "focus:ring-purple-400",
  },
  emerald: {
    label: "Green",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-800 border-emerald-200",
    chipDone: "bg-emerald-50 text-emerald-400 border-emerald-100",
    ring: "focus:ring-emerald-400",
  },
  amber: {
    label: "Amber",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    chip: "bg-amber-100 text-amber-800 border-amber-200",
    chipDone: "bg-amber-50 text-amber-400 border-amber-100",
    ring: "focus:ring-amber-400",
  },
  rose: {
    label: "Rose",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
    chip: "bg-rose-100 text-rose-800 border-rose-200",
    chipDone: "bg-rose-50 text-rose-400 border-rose-100",
    ring: "focus:ring-rose-400",
  },
  teal: {
    label: "Teal",
    dot: "bg-teal-500",
    bar: "bg-teal-500",
    chip: "bg-teal-100 text-teal-800 border-teal-200",
    chipDone: "bg-teal-50 text-teal-400 border-teal-100",
    ring: "focus:ring-teal-400",
  },
  indigo: {
    label: "Indigo",
    dot: "bg-indigo-500",
    bar: "bg-indigo-500",
    chip: "bg-indigo-100 text-indigo-800 border-indigo-200",
    chipDone: "bg-indigo-50 text-indigo-400 border-indigo-100",
    ring: "focus:ring-indigo-400",
  },
  orange: {
    label: "Orange",
    dot: "bg-orange-500",
    bar: "bg-orange-500",
    chip: "bg-orange-100 text-orange-800 border-orange-200",
    chipDone: "bg-orange-50 text-orange-400 border-orange-100",
    ring: "focus:ring-orange-400",
  },
};

export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[];
