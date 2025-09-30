// lib/dlpPolicy.ts

export const INFO_TYPES = [
  "PERSON_NAME",
  "EMAIL_ADDRESS",
  "PHONE_NUMBER",
  "DATE_OF_BIRTH",
  "LOCATION",
  "CREDIT_CARD_NUMBER",
];

export const MIN_LIKELIHOOD: "POSSIBLE" | "LIKELY" | "VERY_LIKELY" = "POSSIBLE";

// Irreversible masking (only transform used)
export const MASK_TRANSFORM = {
  characterMaskConfig: {
    maskingCharacter: "*",
    numberToMask: 8,
  },
};

// Accepts optional arg for compatibility; ignores anything except "mask"
export function buildDeidentifyConfig(_method?: "mask") {
  return {
    infoTypeTransformations: {
      transformations: INFO_TYPES.map((name) => ({
        infoTypes: [{ name }],
        primitiveTransformation: MASK_TRANSFORM,
      })),
    },
  };
}

export const INSPECT_CONFIG = {
  includeQuote: false,
  minLikelihood: MIN_LIKELIHOOD,
  infoTypes: INFO_TYPES.map((name) => ({ name })),
};
