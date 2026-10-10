export const BEAN_VARIETIES = [
  {
    value: "Kenya Umoja",
    market: "Rosecoco",
    code: "KAT B1",
    type: "Red mottled bush bean",
    label: "Rosecoco",
    short: "Rosecoco",
  },
  {
    value: "Kenya Tamu",
    market: "Wairimu",
    code: "MAC 34",
    type: "Red/beige speckled climbing bean",
    label: "Wairimu / Sugar (Kenya Tamu)",
    short: "Wairimu",
  },
  {
    value: "RWV Variety",
    market: "Mwitemania",
    code: "RWV",
    type: "Root-rot resistant climbing bean",
    label: "Mwitemania",
    short: "Mwitemania",
  },
];

export const beanLabel = (value) =>
  BEAN_VARIETIES.find((v) => v.value === value)?.label || value;

export const beanShort = (value) =>
  BEAN_VARIETIES.find((v) => v.value === value)?.market || value;