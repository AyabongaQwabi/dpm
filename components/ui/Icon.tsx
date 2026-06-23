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
  type IconProps,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react/ssr";

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
  store: make(Storefront),
  quote: make(Quotes),
};

// Resolve a brand icon for a provider category by slug (falls back gracefully).
export function categoryIcon(slug?: string | null) {
  switch (slug) {
    case "events":
      return Icon.events;
    case "cleaning":
      return Icon.cleaning;
    case "security":
      return Icon.shield;
    case "legal":
      return Icon.legal;
    default:
      return Icon.store;
  }
}

export type { IconProps };
