import {
  Zap, Brain, Flame, MoonStar, CloudRain, Users, PauseCircle, Play, Footprints,
  CalendarCheck, BookOpen, Gem, PiggyBank, NotebookPen, HeartPulse, GraduationCap,
  Briefcase, Coins, Smile, Home, Sparkles, Gamepad2, type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  zap: Zap, brain: Brain, flame: Flame, 'moon-star': MoonStar, 'cloud-rain': CloudRain,
  users: Users, 'pause-circle': PauseCircle, play: Play, footprints: Footprints,
  'calendar-check': CalendarCheck, 'book-open': BookOpen, gem: Gem,
  'piggy-bank': PiggyBank, 'notebook-pen': NotebookPen, 'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap, briefcase: Briefcase, coins: Coins, smile: Smile,
  home: Home, sparkles: Sparkles, 'gamepad-2': Gamepad2,
}

export function Icon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Cmp = ICONS[name] ?? Sparkles
  return <Cmp size={size} className={className} />
}
