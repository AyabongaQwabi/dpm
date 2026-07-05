// Shared brand icon layer — Phosphor at a consistent rounded weight.
// Centralised so every visitor-facing surface uses one warm, hand-finished
// icon vocabulary instead of mixed geometric sets.
import {
  MagnifyingGlass,
  MapPin,
  Star,
  ShieldCheck,
  SealCheck,
  Sparkle,
  ArrowRight,
  CaretRight,
  CalendarHeart,
  Broom,
  Scales,
  ForkKnife,
  Lightning,
  ChatCircleDots,
  EnvelopeSimple,
  ArrowSquareOut,
  Sun,
  Moon,
  Desktop,
  List,
  X,
  Confetti,
  HandHeart,
  Storefront,
  Quotes,
  Wrench,
  Car,
  Calculator,
  Stethoscope,
  PawPrint,
  Truck,
  Buildings,
  GraduationCap,
  Camera,
} from "@phosphor-icons/react/ssr";
import type { IconProps, Icon as PhosphorIcon } from "@phosphor-icons/react";

function make(Glyph: PhosphorIcon) {
  function Wrapped(props: IconProps) {
    return <Glyph weight="duotone" {...props} />;
  }
  Wrapped.displayName = "Icon";
  return Wrapped;
}

export const Icon = {
  search: make(MagnifyingGlass),
  pin: make(MapPin),
  star: make(Star),
  shield: make(ShieldCheck),
  verified: make(SealCheck),
  sparkle: make(Sparkle),
  arrowRight: make(ArrowRight),
  caretRight: make(CaretRight),
  events: make(CalendarHeart),
  cleaning: make(Broom),
  legal: make(Scales),
  catering: make(ForkKnife),
  bolt: make(Lightning),
  chat: make(ChatCircleDots),
  mail: make(EnvelopeSimple),
  external: make(ArrowSquareOut),
  sun: make(Sun),
  moon: make(Moon),
  desktop: make(Desktop),
  menu: make(List),
  close: make(X),
  confetti: make(Confetti),
  heart: make(HandHeart),
  beauty: make(Sparkle),
  store: make(Storefront),
  quote: make(Quotes),
  home: make(Wrench),
  automotive: make(Car),
  finance: make(Calculator),
  health: make(Stethoscope),
  pets: make(PawPrint),
  transport: make(Truck),
  property: make(Buildings),
  tech: make(Desktop),
  education: make(GraduationCap),
  media: make(Camera),
};

// Resolve a brand icon for a provider category by slug (falls back gracefully).
export function categoryIcon(slug?: string | null) {
  switch (slug) {
    case "cleaning":
      return Icon.cleaning;
    case "events":
      return Icon.events;
    case "security":
      return Icon.shield;
    case "home":
      return Icon.home;
    case "automotive":
      return Icon.automotive;
    case "beauty":
      return Icon.beauty;
    case "legal":
      return Icon.legal;
    case "finance":
      return Icon.finance;
    case "health":
      return Icon.health;
    case "education":
      return Icon.education;
    case "pets":
      return Icon.pets;
    case "transport":
      return Icon.transport;
    case "property":
      return Icon.property;
    case "tech":
      return Icon.tech;
    case "media":
      return Icon.media;
    default:
      return Icon.store;
  }
}

export type { IconProps };
