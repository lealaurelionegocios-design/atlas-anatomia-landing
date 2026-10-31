import type { Market } from "./market";

export interface ChecklistSection {
  section: string;
  items: string[];
}

export interface ChecklistTemplate {
  slug: string;
  title: string;
  markets: Market[];
  sections: ChecklistSection[];
}

const standard: ChecklistTemplate = {
  slug: "standard-cleaning-checklist",
  title: "Standard Cleaning Checklist",
  markets: ["US", "UK"],
  sections: [
    {
      section: "Kitchen",
      items: [
        "Wipe countertops and backsplash",
        "Clean exterior of appliances",
        "Clean stovetop / hob",
        "Clean and shine sink and taps",
        "Wipe cabinet fronts (spot clean)",
        "Empty bins and replace liners",
        "Sweep and mop floor",
      ],
    },
    {
      section: "Bathrooms",
      items: [
        "Clean and disinfect toilet",
        "Clean shower, bath and screens",
        "Clean sink, vanity and mirror",
        "Wipe fixtures and towel rails",
        "Empty bins",
        "Mop floor",
      ],
    },
    {
      section: "Living areas & bedrooms",
      items: [
        "Dust reachable surfaces and shelves",
        "Dust skirting boards (spot)",
        "Vacuum carpets and rugs",
        "Mop hard floors",
        "Make beds / change linen (if requested)",
        "Tidy and straighten cushions",
      ],
    },
    {
      section: "Final walkthrough",
      items: ["Check all rooms against client preferences", "Lights off, windows closed", "Secure property as agreed"],
    },
  ],
};

const deep: ChecklistTemplate = {
  slug: "deep-cleaning-checklist",
  title: "Deep Cleaning Checklist",
  markets: ["US", "UK"],
  sections: [
    {
      section: "Kitchen",
      items: [
        "Degrease cabinet fronts and handles",
        "Clean inside microwave",
        "Clean oven interior (if included in scope)",
        "Clean inside refrigerator (if included in scope)",
        "Degrease extractor hood and filter",
        "Descale sink and taps",
        "Wipe light switches and sockets",
        "Clean behind and under movable appliances",
        "Scrub floor edges and corners",
      ],
    },
    {
      section: "Bathrooms",
      items: [
        "Descale shower head, glass and tiles",
        "Scrub grout lines",
        "Deep clean toilet including base and hinges",
        "Clean inside cabinets and drawers",
        "Clean extractor fan cover",
        "Polish chrome fixtures",
      ],
    },
    {
      section: "Whole home",
      items: [
        "Dust high areas, ceiling corners and cobwebs",
        "Wipe doors, frames and handles",
        "Clean skirting boards / baseboards",
        "Clean interior window sills and tracks",
        "Dust blinds and lampshades",
        "Vacuum upholstery and under cushions",
        "Vacuum under beds and furniture (where accessible)",
        "Wipe radiators / vents",
      ],
    },
    {
      section: "Final walkthrough",
      items: ["Photograph completed areas (with client consent)", "Note any damage or issues found", "Secure property as agreed"],
    },
  ],
};

const moveInOut: ChecklistTemplate = {
  slug: "move-in-move-out-checklist",
  title: "Move-In / Move-Out Cleaning Checklist",
  markets: ["US"],
  sections: [
    {
      section: "Kitchen",
      items: [
        "Clean inside and outside all cabinets and drawers",
        "Clean inside oven, racks and broiler pan",
        "Clean inside refrigerator and freezer",
        "Clean dishwasher interior and filter",
        "Degrease range hood",
        "Clean behind refrigerator and range (if movable)",
        "Scrub sink and disposal area",
        "Mop floor including edges",
      ],
    },
    {
      section: "Bathrooms",
      items: [
        "Descale tub, shower and tiles",
        "Clean inside vanity and medicine cabinet",
        "Disinfect toilet including base",
        "Clean mirrors and fixtures",
        "Clean exhaust fan cover",
        "Mop floor",
      ],
    },
    {
      section: "All rooms",
      items: [
        "Clean inside closets and shelves",
        "Wipe baseboards, doors and frames",
        "Clean light switches and outlet covers",
        "Clean interior windows, sills and tracks",
        "Dust ceiling fans and light fixtures",
        "Vacuum and mop all floors",
        "Remove all trash from the property",
      ],
    },
    {
      section: "Handover",
      items: [
        "Walkthrough with client or agent (if requested)",
        "Note pre-existing damage separately (not cleaning-related)",
        "Return keys as agreed",
      ],
    },
  ],
};

const endOfTenancy: ChecklistTemplate = {
  slug: "end-of-tenancy-checklist",
  title: "End of Tenancy Cleaning Checklist",
  markets: ["UK"],
  sections: [
    {
      section: "Kitchen",
      items: [
        "Clean inside and outside all cupboards and drawers",
        "Clean oven, hob, racks and trays",
        "Defrost (if agreed) and clean fridge-freezer",
        "Clean washing machine drawer and seal",
        "Degrease extractor hood and filter",
        "Descale sink and taps",
        "Clean tiles and splashback",
        "Mop floor including edges",
      ],
    },
    {
      section: "Bathrooms",
      items: [
        "Descale bath, shower, screen and tiles",
        "Clean inside bathroom cabinets",
        "Disinfect toilet including base and cistern",
        "Polish mirrors and chrome",
        "Clean extractor fan cover",
        "Mop floor",
      ],
    },
    {
      section: "All rooms",
      items: [
        "Clean inside wardrobes and built-in storage",
        "Wipe skirting boards, doors and frames",
        "Clean switches and sockets",
        "Clean interior windows, sills and frames",
        "Dust light fittings and lampshades",
        "Wipe radiators",
        "Vacuum carpets and mop hard floors",
        "Remove all rubbish from the property",
      ],
    },
    {
      section: "Check-out",
      items: [
        "Compare against the inventory / check-in report if provided",
        "Note issues outside cleaning scope (damage, wear and tear)",
        "Return keys as agreed with the agent or landlord",
      ],
    },
  ],
};

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [standard, deep, moveInOut, endOfTenancy];

export function checklistBySlug(slug: string | null | undefined): ChecklistTemplate | undefined {
  return CHECKLIST_TEMPLATES.find((c) => c.slug === slug);
}

/** Default checklist for a service type in a market. */
export function defaultChecklistFor(serviceType: string, market: Market | string): ChecklistTemplate {
  switch (serviceType) {
    case "deep":
      return deep;
    case "move_in_out":
      return market === "UK" ? endOfTenancy : moveInOut;
    case "end_of_tenancy":
      return market === "US" ? moveInOut : endOfTenancy;
    default:
      return standard;
  }
}

export function checklistsForMarket(market: Market | string): ChecklistTemplate[] {
  return CHECKLIST_TEMPLATES.filter((c) => c.markets.includes(market === "UK" ? "UK" : "US"));
}

export function flattenChecklist(template: ChecklistTemplate): Array<{ section: string; label: string }> {
  return template.sections.flatMap((s) => s.items.map((label) => ({ section: s.section, label })));
}
