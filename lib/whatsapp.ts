// AG7's WhatsApp Business number, digits only (no "+", no spaces) — the
// format wa.me links require. Same number as the tel: link in the
// footer/contact section, just without the "+".
const AG7_WHATSAPP_NUMBER = "917247777724";

/** A wa.me deep link that opens a chat with AG7's WhatsApp number with
    `message` pre-filled — the visitor can still edit it (add their name,
    change the question) before hitting send, same as any wa.me link. */
export function whatsappEnquiryLink(message: string): string {
  return `https://wa.me/${AG7_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
