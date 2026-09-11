// Single source of truth for NJE's contact number — used by both the
// WhatsApp enquiry button and the footer's displayed phone number.
export const NJE_WHATSAPP_NUMBER = "917303837415"; // E.164 without +

/** "917303837415" -> "+91 73038 37415" */
export function formatPhoneDisplay(e164) {
  const countryCode = e164.slice(0, 2);
  const rest = e164.slice(2);
  return `+${countryCode} ${rest.slice(0, 5)} ${rest.slice(5)}`;
}
