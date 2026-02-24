// Persona detection + routing logic
// Offr supports 3 mental-state personas that shape the first experience

export type Persona = "explorer" | "optimizer" | "verifier";

export interface PersonaChoice {
  id: Persona;
  label: string;
  description: string;
  cta: string;
  route: string;
}

export const PERSONAS: PersonaChoice[] = [
  {
    id: "explorer",
    label: "I'm exploring",
    description: "I have interests but I'm not sure what to study or where.",
    cta: "Explore paths →",
    route: "/dashboard/explore",
  },
  {
    id: "optimizer",
    label: "I have a rough plan",
    description: "I know roughly what I want but need smarter options and strategy.",
    cta: "Build my strategy →",
    route: "/dashboard/strategy",
  },
  {
    id: "verifier",
    label: "I need honest odds",
    description: "I know what I'm applying for. I need to know my real chances.",
    cta: "Check my chances →",
    route: "/dashboard/assess",
  },
];

const STORAGE_KEY = "offr_persona";

export function savePersona(persona: Persona): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, persona);
}

export function loadPersona(): Persona | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  return (v as Persona) || null;
}

export function getPersonaRoute(persona: Persona | null): string {
  const found = PERSONAS.find(p => p.id === persona);
  return found?.route ?? "/dashboard";
}
